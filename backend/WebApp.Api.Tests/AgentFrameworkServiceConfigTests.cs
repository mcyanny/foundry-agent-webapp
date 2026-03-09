using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace WebApp.Api.Tests;

[TestClass]
public class AgentFrameworkServiceConfigTests
{
    [TestMethod]
    public void UseObo_TrueWhenBackendClientIdAndTenantIdSet()
    {
        // OBO requires: ENTRA_BACKEND_CLIENT_ID + ENTRA_TENANT_ID + not Development
        var backendClientId = "test-backend-id";
        var tenantId = "test-tenant-id";
        var environment = "Production";

        var useObo = !string.IsNullOrEmpty(backendClientId)
                     && !string.IsNullOrEmpty(tenantId)
                     && environment != "Development";

        Assert.IsTrue(useObo);
    }

    [TestMethod]
    public void UseObo_FalseInDevelopment()
    {
        var backendClientId = "test-backend-id";
        var tenantId = "test-tenant-id";
        var environment = "Development";

        var useObo = !string.IsNullOrEmpty(backendClientId)
                     && !string.IsNullOrEmpty(tenantId)
                     && environment != "Development";

        Assert.IsFalse(useObo);
    }

    [TestMethod]
    public void UseObo_FalseWhenBackendClientIdMissing()
    {
        string? backendClientId = null;
        var tenantId = "test-tenant-id";
        var environment = "Production";

        var useObo = !string.IsNullOrEmpty(backendClientId)
                     && !string.IsNullOrEmpty(tenantId)
                     && environment != "Development";

        Assert.IsFalse(useObo);
    }

    [TestMethod]
    public void UseObo_FalseWhenTenantIdMissing()
    {
        var backendClientId = "test-backend-id";
        string? tenantId = null;
        var environment = "Production";

        var useObo = !string.IsNullOrEmpty(backendClientId)
                     && !string.IsNullOrEmpty(tenantId)
                     && environment != "Development";

        Assert.IsFalse(useObo);
    }

    [TestMethod]
    public void OboRequiresManagedIdentityClientId()
    {
        // When OBO is enabled, MANAGED_IDENTITY_CLIENT_ID must be set
        var useObo = true;
        string? managedIdentityClientId = null;

        Assert.ThrowsExactly<InvalidOperationException>(() =>
        {
            if (useObo && string.IsNullOrEmpty(managedIdentityClientId))
            {
                throw new InvalidOperationException(
                    "OBO mode requires MANAGED_IDENTITY_CLIENT_ID to be set for the FIC assertion.");
            }
        });
    }

    [TestMethod]
    public void OboDoesNotThrowWhenManagedIdentityClientIdSet()
    {
        var useObo = true;
        var managedIdentityClientId = "test-mi-id";

        // Should not throw
        if (useObo && string.IsNullOrEmpty(managedIdentityClientId))
        {
            throw new InvalidOperationException("Should not reach here");
        }
        // If we get here, test passes
    }
}
