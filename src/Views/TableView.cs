namespace FunWithFlags.FunApp.Views
{
    using System.Dynamic;
    using System.Linq;
    using System.Collections.Generic;

    using FunWithFlags.FunCore;

    public class TableView : View
    {
        public string ViewName
        {
            get { return "Table"; }
        }

        public ExpandoObject Get(DatabaseContext db, UserDatabaseContext userDb, UserView uv)
        {
            dynamic model = new ExpandoObject();
            
            // Использовать вильтр UV
            model.Entries = userDb.Tests.ToArray();

            model.Titles = db.UVFields.ToList();

            model.MenuEls = new List<ExpandoObject>();
            dynamic tel = new ExpandoObject();
            tel.Name = "Cущность 1";
            tel.Link = "../nav";
            model.MenuEls.Add(tel);
            
 
            model.View = uv;

            return model;
        }
    }
}
