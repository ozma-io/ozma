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
            
            // Использовать фильтр UV
            model.Entries = userDb.Tests.ToArray();

            model.Titles = db.UVFields.ToList();

            model.Menubar = new List<ExpandoObject>();

            dynamic tel = new ExpandoObject();
            tel.Name = "Cущность 1";
            tel.Link = "../nav";
            tel.Sub = new List<ExpandoObject>();
            model.Menubar.Add(tel);

            dynamic tel2 = new ExpandoObject();
            tel2.Name = "Все";
            tel2.Link = "../uv/1";
            tel2.Sub = new List<ExpandoObject>();
            dynamic tel3 = new ExpandoObject();
            tel3.Name = "Представление";
            tel3.Link = "../uv/1";
            for (int i = 0; i < 3; i++)
            {
                tel2.Sub.Add(tel3);
            }
            model.Menubar.Add(tel2);
            
            

            
 
            model.View = uv;

            return model;
        }
    }
}
