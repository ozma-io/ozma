namespace FunWithFlags.FunApp
{
    using System.IO;
    using Microsoft.AspNetCore.Hosting;
    using Microsoft.Extensions.Configuration;
    using Microsoft.EntityFrameworkCore;
    using Nancy;
    using Nancy.Bootstrappers.Autofac;
    using Nancy.Configuration;
    using Nancy.Conventions;
    using Autofac;

    using FunWithFlags.FunCore;

    /// <summary>
    /// Returns current working directory as the root path for views.
    /// </summary>
    public class CustomRootPathProvider : IRootPathProvider
    {
        public string GetRootPath()
        {
            return Directory.GetCurrentDirectory();
        }
    }
    
    /// <summary>
    /// Sets various aspects of how Nancy behaves.
    /// </summary>
    public class CustomBootstrapper : AutofacNancyBootstrapper
    {
        private DbContextOptions<DatabaseContext> dbOptions;
        private DbContextOptions<UserDatabaseContext> userDbOptions;
        private string environmentName;
        
        public CustomBootstrapper(IHostingEnvironment env, IConfiguration configuration)
        {
            // Build database connection options.
            var optionsBuilder = new DbContextOptionsBuilder<DatabaseContext>()
                .UseNpgsql(configuration["database"]);
            this.dbOptions = optionsBuilder.Options;

            var userOptionsBuilder = new DbContextOptionsBuilder<UserDatabaseContext>()
                .UseNpgsql(configuration["database"]);
            this.userDbOptions = userOptionsBuilder.Options;

            this.environmentName = env.EnvironmentName;
        }

        public override void Configure(INancyEnvironment environment)
        {
            base.Configure(environment);

            if(environmentName == "Debug")
            {
                environment.Tracing(enabled: false, displayErrorTraces: true);
                environment.Views(runtimeViewUpdates: true, runtimeViewDiscovery: true);
            }
        }

        protected override IRootPathProvider RootPathProvider
        {
            get { return new CustomRootPathProvider(); }
        }

        protected override void ConfigureConventions(NancyConventions conventions)
        {
            conventions.StaticContentsConventions.Add(
                // Override-bind directories with content here.
                StaticContentConventionBuilder.AddDirectory("assets")
            );
        }

        /// <summary>
        /// Called on each new request; registers objects that are provided to modules per request.
        /// </summary>
        protected override void ConfigureRequestContainer(ILifetimeScope container, NancyContext context)
        {
            base.ConfigureRequestContainer(container, context);

            var builder = new ContainerBuilder();

            // Provide database context if needed.
            // Disposable objects must be registered as single instances to ensure cleanup.
            builder.Register(c => new DatabaseContext(this.dbOptions)).As<DatabaseContext>().SingleInstance();
            builder.Register(c => new UserDatabaseContext(this.userDbOptions)).As<UserDatabaseContext>().SingleInstance();

            builder.Update(container.ComponentRegistry);
        }
    }
}
