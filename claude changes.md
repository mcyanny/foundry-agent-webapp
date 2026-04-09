⏺ Write(frontend/.env.local)
  ⎿  Wrote 9 lines to frontend/.env.local
      1 # Frontend-only development mode.
      2 # Bypasses Azure AD authentication and backend API calls e
        ntirely.
      3 # The app runs with simulated streaming responses — no Azu
        re credentials needed.
      4 #
      5 # To connect a real agent:
      6 #   1. Remove this file (or set VITE_MOCK_MODE=false)
      7 #   2. Run `azd up` from the repo root to provision Azure
        resources and generate .env files
      8 #   3. Restart the dev server
      9 VITE_MOCK_MODE=true

⏺ Update(frontend/plugins/envcheck.ts)
  ⎿  Added 3 lines
      59      configResolved(config) {
      60        if (config.command !== "serve") return;
      61  
      62 +      // Skip env validation entirely in mock mode — no 
         +Azure credentials needed                                
      63 +      if (config.env["VITE_MOCK_MODE"] === "true") retur
         +n;                                                      
      64 +                                                        
      65        missing = REQUIRED_VARS.filter(
      66          (v) => !process.env[v] || process.env[v] === "un
          defined"
      67        );

⏺ Update(frontend/src/config/authConfig.ts)