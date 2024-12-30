# Ozma — open-source CRM/ERP platform

Ozma is an open-source CRM/ERP platform that allows for the rapid development of customizable enterprise systems. Build and tailor CRM/ERP solutions quickly and efficiently to meet your business needs.

<div align="left">
  <a href="https://ozma.io/ai-business-app-builder/">Get started</a> |
  <a href="https://discord.gg/Mc8YcF63yt">Discord</a> |
  <a href="https://wiki.ozma.io/en/home">Docs</a> |
  <a href="https://ozma.io">Website</a>
  <br />
  <br />
</div>

[![Discord](https://img.shields.io/discord/938075538961080350.svg?label=Chat&logo=discord&color=7289da)](https://discord.gg/Mc8YcF63yt)

<!-- 
<div>
  <a href="https://github.com/ozma-io/ozma/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-Apache 2.0-blue.svg" alt="ozma.io is released under the Apache-2.0 License">
  </a>
  <a href="https://github.com/ozma-io/ozma/issues">
    <img src="https://img.shields.io/github/commit-activity/m/ozma-io/ozma" alt="git commit activity" />
  </a>
  <a href="https://github.com/ozma-io/ozma?tab=readme-ov-file#contributing">
    <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen" alt="PRs welcome!" />
  </a>
</div>

<br>
 -->
![](https://ozma.io/assets/images/main/preview.png)

## Features

- **Low-Code Development**: Accelerate your system development.
- **Fully Customizable**: Adaptable to any business process.
- **Developer-Friendly**: No expensive training required.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Setup Options](#setup-options)
  - [Running in Development Environment](#running-in-development-environment)
  - [Running in Production Environment](#running-in-production-environment)
- [Accessing the Application](#accessing-the-application)
- [Logging In](#logging-in)
  - [Ozma Admin User](#ozma-admin-user)
  - [Keycloak Admin User](#keycloak-admin-user)
- [Managing Users](#managing-users)
  - [Keycloak Integration](#keycloak-integration)
- [Updating the Application](#updating-the-application)
- [Stopping the Application](#stopping-the-application)
- [FAQs](#faqs)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites
Before you begin, ensure you have the following:

- **Operating System**: Ubuntu or any Linux distribution
- **Root Access**: Administrative privileges on your server
- **Docker Engine**: Installed [Docker CE](https://docs.docker.com/engine/install/ubuntu/) (Community Edition)
- **Git**: Installed Git for cloning the repository
- **Domain Name (Optional)**: A registered domain (e.g., `your-address.com`) pointing to your server's IP address.

### Installing Docker and Git
**Install Git:**
```bash
sudo apt update
sudo apt install git
```
**Install Docker:**
- Follow the official Docker installation guide for Ubuntu: [Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

## Setup Options
You can set up Ozma in either a development environment or a production environment, depending on your needs.

### Running in Development Environment
Follow these steps to set up Ozma locally in a development environment.

#### 1. Cloning the Repository
If you haven't already cloned the repository, do so now:
```bash
git clone https://github.com/ozma-io/ozma.git
cd ozma
```
#### 2. Setting Up Environment Variables
Copy the example environment file for development:
```bash
cp env.dev.example .env
```

#### 3. Starting the Development Server
Start the development server using Docker Compose:
```bash
docker compose up
```
This will start the development environment with all the required services.

#### 4. Accessing the Development Server
Once the server is running, you can access the application and administrative interfaces:
- **Ozma Application**: `http://localhost:9080/`
- **Keycloak Admin Interface**: `http://localhost:9080/auth/`
- **Report Generator Admin Interface**: `http://localhost:9080/report-generator/admin/ozma/`
> [!NOTE]
> The development server runs on `http://localhost:9080`. Ensure that port `9080` is open and not used by other applications on your local machine.

#### 5. Default Credentials
Use the following default credentials to log in:

**Ozma Admin User**
- **Username**: `admin@example.com`
- **Password**: `admin` (You will be prompted to change your password upon first login)
  
**Keycloak Admin User**
- **Username**: `admin`
- **Password**: `admin`

### Running in Production Environment
Follow these steps to install Ozma in a production environment.

#### 1. Setting Up the Server
Set up a machine with Linux (Ubuntu is recommended). You can use any cloud provider such as AWS, Google Cloud, Yandex.Cloud etc.

#### 2. Domain Configuration (Optional)
- Register a domain name or use an existing one (e.g., your-domain.com).
- Create an A record in your DNS settings pointing `your-domain.com` to your server's IP address.
- If using a subdomain, ensure it also points to your server.

#### 3. Installing Necessary Software
Update your package lists:
```bash
sudo apt update
```
Install Git and other dependencies:
```bash
sudo apt install git ca-certificates curl
```
Install Docker (if you haven't already done it): 
```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo \
"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
$(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install docker-ce
```

#### 4. Cloning the Repository
Clone the Ozma repository:
```bash
git clone https://github.com/ozma-io/ozma.git
cd ozma
```

#### 5. Setting Up Environment Variables
Copy the example environment file for production:
```bash
cp env.production.example .env
```
Edit the .env file:
```bash
nano .env
```
In the `.env` file, you need to:
- **Set Keycloak Admin Password**: Assign a strong password to `KEYCLOAK_ADMIN_PASSWORD`.
- **Update Domain/IP Address**: Replace `example.com` with your domain or server IP in `CADDY_ADDRESS` and `EXTERNAL_ORIGIN`.
- **Define Admin Email:** Set `ADMIN_EMAIL` to your administrator's email address.
> [!NOTE]
> Ensure that the `EXTERNAL_ORIGIN` matches the address you will use to access the application. This setting is applied only during the initial setup. If you change it later, you will need to recreate the containers (see below).

#### 6. Running the Application
Start the application in production mode:
```bash
docker compose up -d
```
Wait for Docker to pull images and start the containers. This may take some time.

#### 7. Accessing the Application
Once the containers are up and running, you can access the application at your domain:
- **Ozma Application**: `https://your-address.com/` *(or `http://your-address.com/` if SSL is configured)*
- **Keycloak Admin Interface**: `https://your-address.com/auth/`  *(or `https://your-address.com/auth/` if SSL is not configured)*
- **Report Generator Admin Interface**: `https://your-address.com/report-generator/admin/ozma/` *(or `https://your-address.com/report-generator/admin/ozma/` if SSL is not configured)*

> [!NOTE]
> Replace `your-address.com` with your actual domain name or IP address.
>
> If you wish to secure your application with HTTPS without a registered domain, you can use a self-signed certificate or services like [Let's Encrypt](https://letsencrypt.org/), although the latter typically requires domain verification.

## Accessing the Application
After setting up either the development or production environment, you can access the application using the URLs provided.
> [!IMPORTANT]
> Some URLs require a trailing slash (`/`) at the end. Always use the URLs as specified to avoid any issues.

## Logging In
###  Ozma Admin User
- **Username**: 
  - For production: The `ADMIN_EMAIL` you set in your `.env` file.
  - For development: `admin@example.com`
- **Password**: `admin` (You will be prompted to change your password upon first login)

### Keycloak Admin User
- **Username**: `admin`
- **Password**: 
  - For production: The password you set in `KEYCLOAK_ADMIN_PASSWORD` in your `.env` file.
  - For development: `admin`

## Managing Users
### Keycloak Integration
Ozma uses Keycloak for user authentication and management. To manage users:
1. Access the Keycloak Admin Interface at `https://your-address.com/auth/`
2. Log in with:
- **Username**: `admin`
- **Password**: The password you set in `KEYCLOAK_ADMIN_PASSWORD` in your `.env` file

#### Google Integration in Keycloak
You can configure Google integration in Keycloak to allow users to log in with their Google accounts:
- Follow this guide: [Signing in with Google with Keycloak](https://medium.com/@stefannovak96/signing-in-with-google-with-keycloak-bf5166e93d1e)
> [!NOTE]
> After setting up Google integration, users can log in with their Google accounts. Ensure that their emails are added to the `public.users` table in the database to grant them access to the system.

## Updating the Application
To update the application to the latest version:

Pull the latest changes from the repository:
```bash
git pull
```
Rebuild and restart the containers:
```bash
docker compose up --build --pull always --remove-orphans -d
```
> [!WARNING]
> Be cautious when pulling the latest changes. Major updates might include breaking changes such as database upgrades. **Always back up your data before updating**.

## Stopping the Application
To stop the application:
```bash
docker compose down
```
If you want to remove all data and volumes (this will delete your databases and any stored data), run:
```bash
docker compose down -v
```
> [!WARNING]
> Removing volumes will delete your databases and any persistent data.

## FAQs
### Q1: I can't access the Keycloak admin interface.
A: Ensure you are accessing the correct URL with a trailing slash: `https://your-address.com/auth/`

### Q2: I'm getting an error about a missing user view user.main.
A: This indicates that the database is empty. You may need to import your database dump or check that the migrations have run correctly.

### Q3: How do I import a database dump into Ozma?
A: To import a database dump (for testing or restoring data), please follow our detailed [Database Import Guide](https://wiki.ozma.io/en/installation/database-import). This guide provides step-by-step instructions to ensure a smooth and successful import process.

### Q4: How do I configure Google authentication in Keycloak?
A: Follow the guide here: [Signing in with Google with Keycloak](https://medium.com/@stefannovak96/signing-in-with-google-with-keycloak-bf5166e93d1e)

### Q5: I updated the repository and now the application is not working.
A: Ensure you have rebuilt the Docker images and restarted the containers using:
```bash
docker compose up --build --pull always --remove-orphans -d
```
Check for any breaking changes in the update notes or contact the maintainers for support.

### Q6: How do I completely remove the application and all its data?
A: Run the following command to stop the containers and remove all associated volumes:
```bash
docker compose down -v
```

### Q7: How can I contribute to the project?
A: Please refer to the [Contributing](#contributing) section below.

## Contributing
We welcome contributions from the community. Please follow these steps:
1. Fork the repository.
2. Create a new branch with a descriptive name.
3. Make your changes and commit them with clear messages.
4. Submit a pull request to the `main` branch.

## License
This project is licensed under the **Apache License 2.0**. You may obtain a copy of the License at [LICENSE](/LICENSE).

## Quick Deploy

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/ozma-io/ozma)

### Heroku Deployment Steps

1. Click the "Deploy to Heroku" button above
2. Fill in the required environment variables:
   - `ADMIN_EMAIL`: Your administrator email
   - `KEYCLOAK_ADMIN_PASSWORD`: Will be auto-generated
   - `POSTGRES_PASSWORD`: Will be auto-generated
   - `PORT`: Default is 8080
3. Click "Deploy"

> [!NOTE]
> If deploying manually via Git or Heroku CLI instead of the "Deploy to Heroku" button, you'll need to set HEROKU_APP_NAME manually:
> ```bash
> heroku config:set HEROKU_APP_NAME=$(heroku info --json | jq -r .app.name)
> ```

4. Once deployed, you can access:
   - Ozma Application: `https://your-app-name.herokuapp.com/`
   - Keycloak Admin: `https://your-app-name.herokuapp.com/auth/`
   - Report Generator: `https://your-app-name.herokuapp.com/report-generator/admin/ozma/`

> [!NOTE]
> The free tier of Heroku has limited resources. For production use, consider upgrading to a paid plan.

5. Default Credentials:
   - Ozma Admin: Use the email you provided with initial password `admin`
   - Keycloak Admin: Username `admin`, password is auto-generated (check your Heroku app config vars)

6. Important Notes:
   - The PostgreSQL hobby-dev plan has a 10,000 row limit
   - Heroku's container stack has a startup timeout of 60 seconds
   - File storage is ephemeral - use external storage for production
