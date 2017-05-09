namespace FunWithFlags.FunApp
{
    using System;
    using System.Linq;
    using System.Security.Claims;
    using System.Security.Principal;
    using System.Dynamic;
    using Microsoft.EntityFrameworkCore;
    using Nancy;
    using Nancy.Extensions;
    using Nancy.Authentication.Forms;

    using FunWithFlags.FunCore;

    public class CustomUserMapper : IUserMapper
    {
        private DatabaseContext db;

        public CustomUserMapper(DatabaseContext db)
        {
            this.db = db;
        }
        
        public ClaimsPrincipal GetUserFromIdentifier(Guid identifier, NancyContext context)
        {
            var entry = this.db.Users.Where(u => u.GUID == identifier).FirstOrDefault();
            if (entry != null)
            {
                return new ClaimsPrincipal(entry);
            }
            else
            {
                return null;
            }
        }
    }
    
    public class AuthModule : NancyModule
    {
        public AuthModule(DatabaseContext db)
        {
            Get("/login", args =>
            {
                dynamic model = new ExpandoObject();
                model.Errored = this.Request.Query.error.HasValue;
                model.Name = this.Request.Query.name.Value;

                return View["Login", model];
            });

            Post("/login", args =>
            {
                var name = (string)this.Request.Form.name ?? "";
                var user = db.Users.Where(u => u.Name == name).FirstOrDefault();
                if (user != null && user.CheckPassword((string)this.Request.Form.password))
                {
                    DateTime? expiry = null;
                    return this.LoginAndRedirect(user.GUID, expiry);
                }
                else
                {
                    var encUrl = "";
                    if (this.Request.Query.returnUrl != null)
                    {
                        encUrl = $"&returnUrl={(Uri.EscapeDataString(this.Request.Query.returnUrl))}";
                    }
                    var encName = Uri.EscapeDataString(name);
                    return this.Context.GetRedirect($"~/login?error=true&name={encName}");
                }
            });

            Get("/logout", args => {
                return this.LogoutAndRedirect("~/login");
            });
        }
    }
}
