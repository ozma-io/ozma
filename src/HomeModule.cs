namespace FunWithFlags.FunApp
{
    using System.Linq;
    using Nancy;

    using FunWithFlags.FunCore;

    public class HomeModule : NancyModule
    {
        public HomeModule(DatabaseContext db, UserDatabaseContext userDb)
        {        
            Get("/", _ =>
            {
                return View["Authorization"];
            });

            Get("/nav", _ =>
            {
                var model = new
                {
                    MenuCategories = db.MenuCategories
                                       .GroupJoin(db.Entities,
                                                  category => category.Id,
                                                  entity => entity.MenuCategoryId,
                                                  (category, entities) => new { Category = category, Entities = entities.ToList() })
                                       .ToList()
                };

                return View["Navigator", model];
            });

            Get("/form", _ =>
            {
/*
                var model = new
                {
                    Entries = userDb.Tests[1]
                    Entries = userDb.Tests[1]
                                       .GroupJoin(db.Fields,
                                                  category => category.Id,
                                                  entity => entity.MenuCategoryId,
                                                  (category, entities) => new { Category = category, Entities = entities.ToList() })
                                       .ToList()
                };
 */
                return View["Form"];
            });

            Get("/tabl", _ =>
            {
                var model = new
                {
                    Entries = userDb.Tests.ToArray()
                };

                return View["Table", model];
            });

            /*
            Get("/products/{id}", parameters =>
            {
                return $"Hello Bar, id: {parameters.id}";
            });
            */
        }
    }
}
