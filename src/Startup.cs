namespace FunWithFlags.FunApp
{
    using System.IO;
    using Microsoft.AspNetCore.Builder;
    using Microsoft.AspNetCore.Hosting;
    using Microsoft.Extensions.Configuration;
    using Nancy.Owin;

    public class Startup
    {
        public void Configure(IApplicationBuilder app, IHostingEnvironment env, IConfiguration config)
        {
            var nancyOptions = new NancyOptions();
            // Main configuration happens in the bootstrapper.
            nancyOptions.Bootstrapper = new CustomBootstrapper(env, config);

            app.UseOwin(pl => pl.UseNancy(nancyOptions));
        }
    }
}
