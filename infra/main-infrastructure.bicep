param location string
param tags object
param resourceToken string

var abbrs = loadJsonContent('./abbreviations.json')

var defaultTags = {
  'azd-env-name': resourceToken
}

var allTags = union(tags, defaultTags)

// Log Analytics Workspace
module logAnalytics './core/host/log-analytics.bicep' = {
  name: 'log-analytics'
  params: {
    name: '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
    location: location
    tags: allTags
  }
}

// Application Insights (backend)
module appInsights './core/host/application-insights.bicep' = {
  name: 'appInsights'
  params: {
    name: '${abbrs.insightsComponents}${resourceToken}'
    location: location
    tags: allTags
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
  }
}

// Application Insights (frontend) — separate resource so browser telemetry doesn't pollute server metrics
module appInsightsFrontend './core/host/application-insights.bicep' = {
  name: 'appInsightsFrontend'
  params: {
    name: '${abbrs.insightsComponents}fe-${resourceToken}'
    location: location
    tags: allTags
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
  }
}

// Container Registry
module containerRegistry './core/host/container-registry.bicep' = {
  name: 'container-registry'
  params: {
    name: '${abbrs.containerRegistryRegistries}${resourceToken}'
    location: location
    tags: allTags
    acrPullPrincipalId: managedIdentity.properties.principalId
  }
}

// Container Apps Environment
module containerAppsEnvironment './core/host/container-apps-environment.bicep' = {
  name: 'container-apps-environment'
  params: {
    name: '${abbrs.appManagedEnvironments}${resourceToken}'
    location: location
    tags: allTags
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
  }
}

// Azure Storage Account for Projects table
// Name: 'st' + 13-char unique token = 15 chars (within 3-24 limit, all lowercase alphanumeric)
resource projectsStorage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'st${resourceToken}'
  location: location
  tags: allTags
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

// Storage Table Data Contributor — lets the managed identity read/write to tables
// Role ID: 0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3
resource storageTableRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(projectsStorage.id, managedIdentity.id, 'table-data-contributor')
  scope: projectsStorage
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3')
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

output appInsightsConnectionString string = appInsights.outputs.connectionString
output appInsightsFrontendConnectionString string = appInsightsFrontend.outputs.connectionString
output containerRegistryName string = containerRegistry.outputs.name
output containerRegistryLoginServer string = containerRegistry.outputs.loginServer
output containerAppsEnvironmentId string = containerAppsEnvironment.outputs.id
output storageTableEndpoint string = projectsStorage.properties.primaryEndpoints.table

// User-assigned managed identity — created independently so its principalId
// is available for both Entra FIC and Container App/ACR assignment without circular dependency.
// isolationScope: Regional ensures the identity can only be used in the deployment region.
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: '${abbrs.managedIdentityUserAssignedIdentities}web-${resourceToken}'
  location: location
  tags: allTags
  properties: {
    isolationScope: 'Regional'
  }
}

output managedIdentityId string = managedIdentity.id
output managedIdentityPrincipalId string = managedIdentity.properties.principalId
output managedIdentityClientId string = managedIdentity.properties.clientId
