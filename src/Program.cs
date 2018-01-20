namespace FunWithFlags.FunApp
{
    using System.IO;
    using Microsoft.AspNetCore.Builder;
    using Microsoft.AspNetCore.Hosting;
    using Microsoft.Extensions.Configuration;
    using Microsoft.Extensions.DependencyInjection;
    using Microsoft.Extensions.Logging;
    using Nancy.Owin;

    public static class Program
    {
        public static void Main(string[] args)
        {
            var config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("hosting.json", optional: true)
                .AddEnvironmentVariables()
                .AddCommandLine(args)
                .Build();
                
            var host = new WebHostBuilder()
                .UseKestrel()
                .UseConfiguration(config)
                // Pass config to Startup via dependency injection.
                .ConfigureServices(services => services.AddSingleton<IConfiguration>(config))
                .ConfigureLogging((hostingContext, logging) =>
                    logging
                        .AddConfiguration(hostingContext.Configuration.GetSection("Logging"))
                        .AddConsole()
                        .AddDebug()
                )
                .UseStartup<Startup>()
                .Build();

            host.Run();
        }
    }
}
