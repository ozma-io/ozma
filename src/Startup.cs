namespace FunWithFlags.FunApp
{
    using System.IO;
    using Microsoft.AspNetCore.Builder;
    using Microsoft.AspNetCore.Hosting;
    using Microsoft.Extensions.Configuration;
    using Microsoft.Extensions.Logging;
    using Nancy.Owin;

    public class Startup
    {
        public void Configure(IApplicationBuilder app, IHostingEnvironment env, IConfiguration config, ILoggerFactory loggerFactory)
        {
            var nancyOptions = new NancyOptions();
            // Main configuration happens in the bootstrapper.
            nancyOptions.Bootstrapper = new CustomBootstrapper(env, config, loggerFactory);

            app.UseOwin(pl => pl.UseNancy(nancyOptions));
        }
    }
}
