#!/usr/bin/env python3

import argparse
import json
import sys
import hashlib
import base64
import os


ITERATIONS = 180000


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--external-origin", type=str, required=True)
    parser.add_argument("--admin-email", type=str, required=True)
    parser.add_argument("--admin-password", type=str, required=True)
    args = parser.parse_args()

    realm = json.load(sys.stdin)
    
    # Replace admin email placeholder
    for user in realm.get("users", []):
        if user.get("id") == "admin":
            user["username"] = args.admin_email
            user["email"] = args.admin_email
            
            # Update password credentials
            for credential in user.get("credentials", []):
                if credential.get("type") == "password":
                    # Generate a random salt
                    salt = os.urandom(16)
                    salt_b64 = base64.b64encode(salt).decode('utf-8')
                    
                    # Hash the password with the salt
                    pwd_hash = hashlib.pbkdf2_hmac('sha256', args.admin_password.encode('utf-8'), salt, ITERATIONS)
                    pwd_hash_b64 = base64.b64encode(pwd_hash).decode('utf-8')
                    
                    # Set credential data in Keycloak format
                    credential["credentialData"] = json.dumps({"hashIterations": ITERATIONS, "algorithm": "pbkdf2-sha256"})
                    credential["secretData"] = json.dumps({"salt": salt_b64, "value": pwd_hash_b64})
    
    # Replace EXTERNAL_ORIGIN placeholders in clients
    for client in realm.get("clients", []):
        # Update redirectUris
        if "redirectUris" in client:
            client["redirectUris"] = [uri.replace("{EXTERNAL_ORIGIN}", args.external_origin) 
                                     for uri in client["redirectUris"]]
        
        # Update webOrigins
        if "webOrigins" in client:
            client["webOrigins"] = [origin.replace("{EXTERNAL_ORIGIN}", args.external_origin) 
                                   for origin in client["webOrigins"]]
    
    # Output the modified realm configuration
    json.dump(realm, sys.stdout, indent=2)


if __name__ == "__main__":
    main()
