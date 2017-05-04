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
            tel.Sub = new List<ExpandoObject>();
            model.MenuEls.Add(tel);

            tel.Name = "Все";
            tel.Link = "../uv/1";
            tel.Sub = new List<ExpandoObject>();
            dynamic tel2 = new ExpandoObject();
            tel2.Name = "Представление 1";
            tel2.Link = "../uv/1";
            tel.Sub.Add(tel2);
            model.MenuEls.Add(tel);

            
 
            model.View = uv;

            return model;
        }
    }
}
