# Ozma

## How to run

To run the development environment with all the required services:
1. Copy `env.dev.example` to `.env`;
2. Run `docker compose up`.

This starts a development server at https://localhost:9080. The Keycloak admin user (when opening Keycloak) is `admin` and the password is `admin`. The database admin user (when opening ozma) is `admin@example.com` and the password is `admin`. You will be required to reset the password for the admin user the first time you log in.

To run it in the production environment:
1. Copy `env.production.example` to `.env` and modify it as fit;
2. Run `docker compose up -d`.

This starts a production server at :80 and :443 ports. Be sure to open the ports in your firewall or router, and to point your domain to the server. HTTPS certificates are automatically generated using Let's Encrypt. The Keycloak admin user (when opening Keycloak) is `admin` and the password is set in the environment file. The database admin user (when opening ozma) is set in the environment file, and the password is `admin`. You will be required to reset the password for the admin user the first time you log in.

URLs of interest (for production, replace `http://localhost:9080` with your domain):
* http://localhost:9080/ — the application
* http://localhost:9080/auth/ - Keycloak admin interface.
* http://localhost:9080/report-generator/admin/ozma/ - Report generator admin interface.