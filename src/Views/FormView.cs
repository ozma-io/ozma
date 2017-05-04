namespace FunWithFlags.FunApp.Views
{
    using System.Dynamic;
    using System.Linq;
    using System.Collections.Generic;

    using FunWithFlags.FunCore;

    public class FormView : View
    {
        public string ViewName
        {
            get { return "Form"; }
        }

        public ExpandoObject Get(DatabaseContext db, UserDatabaseContext userDb, UserView uv)
        {
            dynamic model = new ExpandoObject();
            
            model.View = uv;


            // Временная реализация меню - полностью заменить на создание через функцию в TableView.cs

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

            dynamic t1 = new ExpandoObject();
            t1.Name = "Основная";
            t1.Link = "../uv/2";
            t1.Sub = new List<ExpandoObject>();
            dynamic t2 = new ExpandoObject();
            t2.Name = "Форма";
            t2.Link = "../uv/2";
            for (int i = 0; i < 3; i++)
            {
                t1.Sub.Add(t2);
            }
            model.Menubar.Add(t1);

            // Конец временно реализации меню
            

            return model;
        }
    }
}
