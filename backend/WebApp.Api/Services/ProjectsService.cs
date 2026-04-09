using Azure;
using Azure.Core;
using Azure.Data.Tables;
using Azure.Identity;
using WebApp.Api.Models;

namespace WebApp.Api.Services;

/// <summary>
/// Manages project metadata in Azure Table Storage.
/// Each project maps to a row in the "Projects" table with a corresponding
/// Azure AI Foundry vector store for project-scoped file search.
///
/// Configuration (required for real deployments):
///   AZURE_STORAGE_TABLE_ENDPOINT  — e.g. https://&lt;account&gt;.table.core.windows.net
///   OR
///   AZURE_STORAGE_TABLE_CONNECTION_STRING — for local dev / Storage Emulator
///
/// If neither is set the service operates in unavailable mode and all endpoints
/// return 503.
/// </summary>
public class ProjectsService
{
    private const string PartitionKey = "projects";
    private const string TableName = "Projects";

    private readonly TableClient? _tableClient;
    private readonly ILogger<ProjectsService> _logger;
    private readonly bool _available;

    public ProjectsService(IConfiguration configuration, ILogger<ProjectsService> logger)
    {
        _logger = logger;

        var connectionString = configuration["AZURE_STORAGE_TABLE_CONNECTION_STRING"];
        var endpoint = configuration["AZURE_STORAGE_TABLE_ENDPOINT"];

        if (!string.IsNullOrEmpty(connectionString))
        {
            _tableClient = new TableClient(connectionString, TableName);
            _available = true;
            _logger.LogInformation("ProjectsService: using Table Storage connection string");
        }
        else if (!string.IsNullOrEmpty(endpoint))
        {
            // Use managed identity or Azure CLI credential (same strategy as AgentFrameworkService)
            var environment = configuration["ASPNETCORE_ENVIRONMENT"] ?? "Production";
            TokenCredential credential = environment == "Development"
                ? new ChainedTokenCredential(new AzureCliCredential(), new AzureDeveloperCliCredential())
                : CreateManagedIdentityCredential(configuration);

            _tableClient = new TableClient(new Uri(endpoint), TableName, credential);
            _available = true;
            _logger.LogInformation("ProjectsService: using Table Storage endpoint {Endpoint}", endpoint);
        }
        else
        {
            _available = false;
            _logger.LogWarning(
                "ProjectsService: neither AZURE_STORAGE_TABLE_ENDPOINT nor " +
                "AZURE_STORAGE_TABLE_CONNECTION_STRING is configured. " +
                "Project endpoints will return 503.");
        }
    }

    private static TokenCredential CreateManagedIdentityCredential(IConfiguration configuration)
    {
        var miClientId = configuration["MANAGED_IDENTITY_CLIENT_ID"]
            ?? configuration["OBO_MANAGED_IDENTITY_CLIENT_ID"];
        return string.IsNullOrEmpty(miClientId)
            ? new ManagedIdentityCredential()
            : new ManagedIdentityCredential(miClientId);
    }

    /// <summary>True when Table Storage is configured and available.</summary>
    public bool IsAvailable => _available;

    /// <summary>Ensure the Projects table exists. Called once at startup.</summary>
    public async Task EnsureTableExistsAsync(CancellationToken cancellationToken = default)
    {
        if (_tableClient is null) return;
        try
        {
            await _tableClient.CreateIfNotExistsAsync(cancellationToken);
            _logger.LogInformation("Projects table ready");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create Projects table");
        }
    }

    public async Task<List<ProjectSummary>> ListProjectsAsync(CancellationToken cancellationToken = default)
    {
        EnsureAvailable();
        var projects = new List<ProjectSummary>();
        await foreach (var entity in _tableClient!.QueryAsync<TableEntity>(
            filter: $"PartitionKey eq '{PartitionKey}'",
            cancellationToken: cancellationToken))
        {
            projects.Add(EntityToSummary(entity));
        }
        // Sort newest first
        projects.Sort((a, b) => b.CreatedAt.CompareTo(a.CreatedAt));
        return projects;
    }

    public async Task<ProjectSummary?> GetProjectAsync(string id, CancellationToken cancellationToken = default)
    {
        EnsureAvailable();
        try
        {
            var response = await _tableClient!.GetEntityAsync<TableEntity>(
                PartitionKey, id, cancellationToken: cancellationToken);
            return EntityToSummary(response.Value);
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return null;
        }
    }

    public async Task<ProjectSummary> CreateProjectAsync(
        string id,
        string name,
        string vectorStoreId,
        string description = "",
        string instructions = "",
        CancellationToken cancellationToken = default)
    {
        EnsureAvailable();
        var now = DateTimeOffset.UtcNow;
        var entity = new TableEntity(PartitionKey, id)
        {
            ["Name"] = name,
            ["Description"] = description,
            ["Instructions"] = instructions,
            ["VectorStoreId"] = vectorStoreId,
            ["CreatedAt"] = now,
            ["UpdatedAt"] = now,
        };
        await _tableClient!.AddEntityAsync(entity, cancellationToken);
        _logger.LogInformation("Created project {Id} ({Name})", id, name);
        return EntityToSummary(entity);
    }

    public async Task<ProjectSummary?> UpdateProjectAsync(
        string id,
        string? name,
        string? description,
        string? instructions,
        CancellationToken cancellationToken = default)
    {
        EnsureAvailable();
        try
        {
            var response = await _tableClient!.GetEntityAsync<TableEntity>(
                PartitionKey, id, cancellationToken: cancellationToken);
            var entity = response.Value;

            if (name is not null) entity["Name"] = name;
            if (description is not null) entity["Description"] = description;
            if (instructions is not null) entity["Instructions"] = instructions;
            entity["UpdatedAt"] = DateTimeOffset.UtcNow;

            await _tableClient.UpdateEntityAsync(entity, ETag.All, TableUpdateMode.Merge, cancellationToken);
            _logger.LogInformation("Updated project {Id}", id);
            return EntityToSummary(entity);
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return null;
        }
    }

    public async Task<bool> DeleteProjectAsync(string id, CancellationToken cancellationToken = default)
    {
        EnsureAvailable();
        try
        {
            await _tableClient!.DeleteEntityAsync(PartitionKey, id, cancellationToken: cancellationToken);
            _logger.LogInformation("Deleted project {Id}", id);
            return true;
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return false;
        }
    }

    private static ProjectSummary EntityToSummary(TableEntity entity)
    {
        var createdAt = entity.TryGetValue("CreatedAt", out var ts) && ts is DateTimeOffset dto
            ? dto.ToUnixTimeSeconds()
            : 0L;

        return new ProjectSummary
        {
            Id = entity.RowKey,
            Name = entity.GetString("Name") ?? string.Empty,
            Description = entity.GetString("Description") ?? string.Empty,
            Instructions = entity.GetString("Instructions") ?? string.Empty,
            VectorStoreId = entity.GetString("VectorStoreId") ?? string.Empty,
            CreatedAt = createdAt,
        };
    }

    private void EnsureAvailable()
    {
        if (!_available || _tableClient is null)
            throw new InvalidOperationException(
                "ProjectsService is not configured. Set AZURE_STORAGE_TABLE_ENDPOINT or " +
                "AZURE_STORAGE_TABLE_CONNECTION_STRING.");
    }
}
