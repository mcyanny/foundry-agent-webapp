namespace WebApp.Api.Models;

/// <summary>
/// Summary of a project returned in list responses.
/// </summary>
public record ProjectSummary
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public string Description { get; init; } = string.Empty;
    public string Instructions { get; init; } = string.Empty;
    public required string VectorStoreId { get; init; }
    public long CreatedAt { get; init; }
    public int FileCount { get; init; }
}

/// <summary>
/// Request body for creating a new project.
/// </summary>
public record CreateProjectRequest
{
    public required string Name { get; init; }
    public string? Description { get; init; }
    public string? Instructions { get; init; }
}

/// <summary>
/// Request body for updating an existing project.
/// </summary>
public record UpdateProjectRequest
{
    public string? Name { get; init; }
    public string? Description { get; init; }
    public string? Instructions { get; init; }
}

/// <summary>
/// Metadata for a file stored in a project's vector store.
/// </summary>
public record VectorStoreFileInfo
{
    public required string FileId { get; init; }
    public required string FileName { get; init; }
    public long CreatedAt { get; init; }
    public long FileSizeBytes { get; init; }
}
