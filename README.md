# Ozma — open-source CRM/ERP platform

[![Discord](https://img.shields.io/discord/938075538961080350.svg?label=Chat&logo=discord&color=7289da)](https://discord.gg/Mc8YcF63yt)

## Introduction
Ozma is an open-source CRM/ERP platform that allows for the rapid development of customizable enterprise systems. Build and tailor CRM/ERP solutions quickly and efficiently to meet your business needs.

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
- [Importing Database Dumps](#importing-database-dumps)
- [Managing Users](#managing-users)
  - [Keycloak Integration](#keycloak-integration)
  - [Restoring Users](#restoring-users)
- [Updating the Application](#updating-the-application)
- [Stopping the Application](#stopping-the-application)
- [FAQs](#faqs)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites
Before you begin, ensure you have the following:

- **Operating System**: Ubuntu or any Linux distribution
- **Root Access**: Administrative privileges on your server
- **Domain Name**: A registered domain (e.g., `your-domain.com`) pointing to your server's IP address
- **Docker Engine**: Installed [Docker CE](https://docs.docker.com/engine/install/ubuntu/) (Community Edition)
- **Git**: Installed Git for cloning the repository

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
Follow these steps to set up Ozma in a development environment.

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
- **Ozma Application**: `https://localhost:9080/`
- **Keycloak Admin Interface**: `https://localhost:9080/auth/`
- **Report Generator Admin Interface**: `http://localhost:9080/report-generator/admin/ozma/`

#### 5. Default Credentials
Use the following default credentials to log in:

**Ozma Admin User**
- **Username**: `admin@example.com`
- **Password**: `admin` (You will be prompted to change your password upon first login)
  
**Keycloak Admin User**
- **Username**: `admin`
- **Password**: `admin`

***Note**: The development server runs on `https://localhost:9080`. Ensure that port `9080` is open and not used by other applications on your local machine.*

### Running in Production Environment
Follow these steps to install Ozma in a production environment.

#### 1. Setting Up the Server
Set up a machine with Linux (Ubuntu is recommended). You can use any cloud provider such as AWS, Google Cloud, Yandex.Cloud etc.

#### 2. Domain Configuration
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
Install Docker:
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
In the .env file, you need to:
- **Set a password for the Keycloak admin user** by replacing `KEYCLOAK_ADMIN_PASSWORD` with your desired password.
- **Replace** `example.com` **with your domain** in `CADDY_ADDRESS` and `EXTERNAL_ORIGIN`.
- **Set** `ADMIN_EMAIL` to your admin email address.

***Note**: Ensure that the `EXTERNAL_ORIGIN` matches the domain you will use to access the application. This setting is applied only during the initial setup. If you change it later, you will need to recreate the containers (see below).*

#### 6. Running the Application
Start the application in production mode:
```bash
docker compose up -d
```
Wait for Docker to pull images and start the containers. This may take some time.

#### 7. Accessing the Application
Once the containers are up and running, you can access the application at your domain:
- **Ozma Application**: `https://your-domain.com/`
- **Keycloak Admin Interface**: `https://your-domain.com/auth/`
- **Report Generator Admin Interface**: `https://your-domain.com/report-generator/admin/ozma/`

***Note**: Replace `your-domain.com` with your actual domain name.*

## Accessing the Application
After setting up either the development or production environment, you can access the application using the URLs provided.

***Important**: Some URLs require a trailing slash (`/`) at the end. Always use the URLs as specified to avoid any issues.*

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

## Importing Database Dumps
If you have a database dump to import (e.g., for testing or restoring data), follow these steps:

### 1. Copy the Database Dump to the Server
You can copy the dump file to your server using `scp` or download it directly on the server using `curl`:
```bash
curl -LO 'https://your-dump-url/ozmadb.pg_dump'
```
### 2. Ensure Containers are Running
If the containers are not already running, start them:
```bash
docker compose up -d
```

### 3. Recreate the Databases
Run the following command to drop and recreate the databases:
```bash
docker compose exec -T postgres psql -U postgres <<< '
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pid <> pg_backend_pid() AND datname IS NOT NULL;

DROP DATABASE "ozmadb";
CREATE DATABASE "ozmadb" OWNER "ozmadb";
\c ozmadb
ALTER SCHEMA public OWNER TO "ozmadb";

DROP DATABASE "ozma-report-generator";
CREATE DATABASE "ozma-report-generator" OWNER "ozma-report-generator";
\c ozma-report-generator
ALTER SCHEMA public OWNER TO "ozma-report-generator";
'
```

***Note**: If you modify the `.env` file after the initial setup, you need to remove existing containers and volumes to apply the changes:*
```bash
docker compose down -v
docker compose up -d
```

### 4. Restore the Databases from the Dumps
Restore the Ozma database:
```bash
docker compose exec -T postgres pg_restore -U ozmadb -d ozmadb -xO < path/to/ozmadb.pg_dump
```
If you are using the Report Generator, restore its database as well:
```bash
docker compose exec -T postgres pg_restore -U ozma-report-generator -d ozma-report-generator -xO < path/to/report-generator.pg_dump
```

### 5. Access the Application
After restoring the databases, you should be able to access the Ozma application at your domain and see your data.

## Managing Users
### Keycloak Integration
Ozma uses Keycloak for user authentication and management. To manage users:
1. Access the Keycloak Admin Interface at `https://your-domain.com/auth/`
2. Log in with:
- **Username**: `admin`
- **Password**: The password you set in `KEYCLOAK_ADMIN_PASSWORD` in your `.env` file

### Restoring Users
**If Users Authenticate via Google**
If your users authenticate via Google, you need to configure Google integration in Keycloak:
- Follow this guide: [Signing in with Google with Keycloak](https://medium.com/@stefannovak96/signing-in-with-google-with-keycloak-bf5166e93d1e)
  
After setting up, users can log in with Google, and if their email matches an email in the `public.users` table in the database, they will have the same permissions as before.

**If Users Do Not Use Google**
If users do not use Google authentication, you need to create user accounts in Keycloak manually:

Log in to Keycloak via command line:
```bash
docker compose exec keycloak /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080/auth --realm master --user admin
```
Create users from the list of users in Ozma:
```bash
docker compose exec -T postgres psql -U postgres ozmadb -tA -c "SELECT email FROM users WHERE email LIKE '%@%';" | \
xargs -I{} docker compose exec keycloak /opt/keycloak/bin/kcadm.sh create users -r ozma -s username={} -s email={} -s enabled=true
```
Instruct your users to use the "Forgot Password" feature on the login page to set their passwords via email.

***Note**: Replace `email` with the appropriate column name from your users table if different.*

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

***Warning**: Be cautious when pulling the latest changes. Major updates might include breaking changes such as database upgrades. **Always back up your data before updating**.*

## Stopping the Application
To stop the application:
```bash
docker compose down
```
If you want to remove all data and volumes (this will delete your databases and any stored data), run:
```bash
docker compose down -v
```
***Warning**: Removing volumes will delete your databases and any persistent data.*

## FAQs
### Q1: I can't access the Keycloak admin interface.
A: Ensure you are accessing the correct URL with a trailing slash: `https://your-domain.com/auth/`

### Q2: I'm getting an error about a missing user view user.main.
A: This indicates that the database is empty. You may need to import your database dump or check that the migrations have run correctly.

### Q3: How do I configure Google authentication in Keycloak?
A: Follow the guide here: [Signing in with Google with Keycloak](https://medium.com/@stefannovak96/signing-in-with-google-with-keycloak-bf5166e93d1e)

### Q4: I updated the repository and now the application is not working.
A: Ensure you have rebuilt the Docker images and restarted the containers using:
```bash
docker compose up --build --pull always --remove-orphans -d
```
Check for any breaking changes in the update notes or contact the maintainers for support.

### Q5: How do I completely remove the application and all its data?
A: Run the following command to stop the containers and remove all associated volumes:
```bash
docker compose down -v
```

### Q6: How can I contribute to the project?
A: Please refer to the [Contributing](#contributing) section below.

## Contributing
We welcome contributions from the community. Please follow these steps:
1. Fork the repository.
2. Create a new branch with a descriptive name.
3. Make your changes and commit them with clear messages.
4. Submit a pull request to the `main` branch.

## License
This project is licensed under the **Apache License 2.0**. You may obtain a copy of the License at [LICENSE](/LICENSE).
