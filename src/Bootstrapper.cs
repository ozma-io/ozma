namespace FunWithFlags.FunApp
{
    using System.IO;
    using Microsoft.AspNetCore.Hosting;
    using Microsoft.Extensions.Configuration;
    using Microsoft.EntityFrameworkCore;
    using Nancy;
    using Nancy.Bootstrapper;
    using Nancy.Bootstrappers.Autofac;
    using Nancy.Authentication.Forms;
    using Nancy.Configuration;
    using Nancy.Conventions;
    using Autofac;

    using FunWithFlags.FunCore;
    using FunWithFlags.FunDB;

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
        private string userDbString;
        private string environmentName;
        
        public CustomBootstrapper(IHostingEnvironment env, IConfiguration configuration)
        {
            // Build database connection options.
            var optionsBuilder = new DbContextOptionsBuilder<DatabaseContext>()
                .UseNpgsql(configuration["database"]);
            this.dbOptions = optionsBuilder.Options;

            this.userDbString = configuration["user_database"];

            this.environmentName = env.EnvironmentName;
        }

        public override void Configure(INancyEnvironment environment)
        {
            base.Configure(environment);

            if (environmentName == "Debug")
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
        /// Registers objects that are provided to modules per request.
        /// </summary>
        protected override void ConfigureRequestContainer(ILifetimeScope container, NancyContext context)
        {
            base.ConfigureRequestContainer(container, context);

            var builder = new ContainerBuilder();

            // Provide database context if needed.
            // Disposable objects must be registered as single instances to ensure cleanup.
            builder.Register(c => new DatabaseContext(this.dbOptions)).As<DatabaseContext>().SingleInstance();
            builder.Register(c => new DBQuery(this.userDbString)).As<DBQuery>().SingleInstance();

            builder.Update(container.ComponentRegistry);
        }

        /// <summary>
        /// Sets per-request hooks.
        /// </summary>
        protected override void RequestStartup(ILifetimeScope container, IPipelines pipelines, NancyContext context)
        {
            base.RequestStartup(container, pipelines, context);
            
            var db = container.Resolve<DatabaseContext>();

            var formsAuthConfiguration = new FormsAuthenticationConfiguration()
                {
                    RedirectUrl = "~/login",
                    UserMapper = new CustomUserMapper(db)
                };
            FormsAuthentication.Enable(pipelines, formsAuthConfiguration);
        }
    }
}
