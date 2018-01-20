namespace FunWithFlags.FunApp
{
    using System;
    using System.IO;
    using System.Globalization;
    using System.Collections.Generic;
    using Microsoft.AspNetCore.Hosting;
    using Microsoft.Extensions.Configuration;
    using Microsoft.Extensions.Logging;
    using Microsoft.EntityFrameworkCore.Infrastructure;
    using Nancy;
    using Nancy.Bootstrapper;
    using Nancy.Bootstrappers.Autofac;
    using Nancy.Authentication.Forms;
    using Nancy.Configuration;
    using Nancy.Conventions;
    using Autofac;
    using NGettext;

    using FunWithFlags.FunCore;
    using FunWithFlags.FunDB.Context;

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
        private readonly string dbString;
        private readonly string environmentName;
        private readonly ILoggerFactory loggerFactory;
        private readonly Dictionary<CultureInfo, ICatalog> catalogs;
        
        public CustomBootstrapper(IHostingEnvironment env, IConfiguration configuration, ILoggerFactory loggerFactory)
        {
            this.dbString = configuration["database"];
            this.loggerFactory = loggerFactory;
            this.environmentName = env.EnvironmentName;
            this.catalogs = new Dictionary<CultureInfo, ICatalog>();

            DotLiquid.Template.RegisterFilter(typeof(LiquidFilter));
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
            builder.Register(c => new Context(this.dbString, this.loggerFactory)).As<Context>().InstancePerRequest();
            builder.Register(c => {
                    ICatalog catalog;
                    if (!this.catalogs.TryGetValue(context.Culture, out catalog))
                    {
                        catalog = new Catalog("FunApp", "./locale", context.Culture);
                        this.catalogs.Add(context.Culture, catalog);
                    }
                    return catalog;
                }).As<ICatalog>().InstancePerRequest();

            builder.Update(container.ComponentRegistry);
        }

        /// <summary>
        /// Sets per-request hooks.
        /// </summary>
        protected override void RequestStartup(ILifetimeScope container, IPipelines pipelines, NancyContext context)
        {
            base.RequestStartup(container, pipelines, context);
            
            var ctx = container.Resolve<Context>();

            var formsAuthConfiguration = new FormsAuthenticationConfiguration()
                {
                    RedirectUrl = "~/login",
                    UserMapper = new CustomUserMapper(ctx.Database)
                };
            FormsAuthentication.Enable(pipelines, formsAuthConfiguration);

            var catalog = container.Resolve<ICatalog>();
            context.Items["catalog"] = catalog;
            context.ViewBag.Language = context.Culture.TwoLetterISOLanguageName;
        }
    }
}
