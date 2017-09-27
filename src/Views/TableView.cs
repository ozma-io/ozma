namespace FunWithFlags.FunApp.Views
{
    using System;
    using System.Dynamic;
    using System.Linq;
    using System.Collections.Generic;
    using Nancy;

    using Microsoft.EntityFrameworkCore;
    using Microsoft.EntityFrameworkCore.Infrastructure;

    using FunWithFlags.FunCore;
    using FunWithFlags.FunDB.Context;
    using FunWithFlags.FunDB.Attribute;
    using FunWithFlags.FunDB.View;
    using FieldName = FunWithFlags.FunDB.FunQL.AST.FieldName;
    using Result = FunWithFlags.FunDB.FunQL.AST.Result<FunWithFlags.FunDB.FunQL.AST.EntityName, FunWithFlags.FunDB.FunQL.AST.FieldName>;

    public class TableView : View
    {
        public string ViewName
        {
            get { return "Table"; }
        }

        public ViewType ViewType
        {
            get { return ViewType.Multiple; }
        }

        public ExpandoObject Get(Context ctx, UserView uv, dynamic getPars)
        {
            var db = ctx.Database;
            dynamic model = new ExpandoObject();

            model.Color = db.Settings.Single(s => s.Name == "bgcolor").Value;

            // Формируем название страницы в браузере
            // FIXME: use name from UserView
            var entitie = db.Entities.Where(e =>
                db.UVEntities.Where(uve =>
                    uve.UserViewId == uv.Id && uve.EntityId == e.Id
                ).Any()
            );
            model.FormName = entitie.First().DisplayNamePlural;

            /*var userViewsF = db.UserViews.Where(uvf =>
                    uvf.Type=="Form" &&
                    db.UVEntities.Where(uve =>
                        //uve.UserViewId == uv.Id &&
                        uve.Id== entitiesQuery.First().Id
                    //entitiesQuery.Where(e => e.Id == uve.EntityId).Any()
                    ).Any()
                ).ToList();
            var uvF = db.UVEntities.Where(uve =>
                          uve.UserViewId == uv.Id /*&&
                        entitiesQuery.Where(e => e.Id == uve.EntityId).Any()
                    ).Join(db.UserViews.Where(uvw =>
                        uvw.Type == "Form").ToList()
                    ).ToList();
            var vvv = userViewsF;
            var vvvE = uvF;
            */

            var resultId = Tuple.Create(Result.NewRField(new FieldName(null, "Id")), new AttributeMap());
            var parsedQuery = ViewResolver.ParseQuery(uv);
            var newQuery = parsedQuery.MergeResults(new[] { resultId });
            var result = ctx.Resolver.RunQuery(newQuery);

            model.Titles = result.Columns.Skip(1).Select(col => new
                {
                    Name = col.Attributes.GetStringWithDefault(col.Name, "Caption"),
                    Width = col.Attributes.GetIntWithDefault(100, "Size", "Width").ToString() + "px"
            });

            var entries = result.Rows.Select(row =>
                row.Cells.Skip(1).Zip(result.Columns.Skip(1), (cell, col) => new
                    {
                        //Value = a,
                        Value = (col.Field.BusinessType != "date") ? cell : cell.Substring(0,10),
                        Width = col.Attributes.GetIntWithDefault(100, "Size", "Width").ToString()+"px",
                        Height = 20,
                        Id =  row.Cells[0],
                        // FIXME: ????
                        href = "window.location.href='../uv/" + (uv.Id+1).ToString()+"?recId="+row.Cells[0].ToString()+"'", 
                }
                ).ToList()
                // сюда положить ссылку на юзервью с формой
            ).ToList();
/* 
            // ! - дописать
            for (int i=0; i<entries.Count(); i++) {
                for (int j=0; j<entries[i].Count(); j++) {
                    if (model.Titles[i].Type == "lookup") {
                        entries[i][j].Value = "FunFun";
                    }
                }
            }
*/
            model.Entries = entries;

            
            /*model.Entries = dbQuery.Query("Tests", new[]
                    {
                        "\"Name\"",
                        "\"Count\"",
                        "\"Description\"",
                        "\"Param1\"",
                        "\"Param2\"",
                    }, ""
            );*/
            
 
            model.View = uv;

            return model;
        }

        public ExpandoObject Post(Context ctx, UserView uv, DynamicDictionary getPars, DynamicDictionary postPars)
        {
            throw new NotImplementedException("TableView Post is not implemented");
        }       
    }
}
