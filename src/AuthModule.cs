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
    using FunWithFlags.FunDB.Context;

    public class CustomUserMapper : IUserMapper
    {
        private readonly DatabaseContext db;

        public CustomUserMapper(DatabaseContext db)
        {
            this.db = db;
        }

        public ClaimsPrincipal GetUserFromIdentifier(Guid identifier, NancyContext context)
        {
            var entry = this.db.Users.Find(User.GetIdFromGuid(identifier));
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
        public AuthModule(Context ctx)
        {
            Get("/login", args =>
            {
                dynamic model = new ExpandoObject();
                model.Errored = this.Request.Query.error.HasValue;
                model.Name = this.Request.Query.name.Value;

                return View["login", model];
            });

            Post("/login", args =>
            {
                var name = (string)this.Request.Form.name ?? "";
                var user = ctx.Database.Users.Where(u => u.Name == name).FirstOrDefault();
                if (user != null && user.CheckPassword((string)this.Request.Form.password))
                {
                    DateTime? expiry = null;
                    return this.LoginAndRedirect(user.Guid, expiry);
                }
                else
                {
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
