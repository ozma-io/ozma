namespace FunWithFlags.FunApp
{
    using System;
    using System.Linq;
    using Microsoft.EntityFrameworkCore;
    using System.Collections.Generic;
    using Nancy;
    using System.Dynamic;

    using FunWithFlags.FunCore;
    using FunWithFlags.FunApp.Views;

    public class HomeModule : NancyModule
    {
        private dynamic[] GetMenuBar(DatabaseContext db, UserDatabaseContext userDb, UserView currUv)
        {

            // Временная реализация меню - Вывести в одельную функцию и привязать ко всем вью.cs

            /*
            Первым элементом добавляем 3 элемента
                название сущностей через запятую привязанные к этому представлению 
                и ссылка на меню навигации
                подменю этому элементу оставляем пустым
            
            Если этот вид юзервью выводит данные по одной записи
                Вторым элементом добавляем 3 элемента 
                    Название основного для этой сущности юзервью
                    и ссылку на него
                    Подменю
                        Все юзервью кроме этого отсортированные в алфавитном порядке
            Иначе (Если этот вид юзервью выводит данные сразу по многим записям)
                Вторым элементом добавляем 3 элемента 
                    текущее название юзервью 
                    и ссылку на него
                    Подменю
                        Все юзервью кроме этого отсортированные в алфавитном порядке
            
            Если этот вид юзервью выводит данные по одной записи
                Доабавляем третий элемент
                    Текущий юзервью
                    Ссылка на него
                    Подменю
                        Все юзервью выводящие данные по 1 записи кроме текущего
            */

            var entitiesQuery = db.Entities.Where(e =>
                db.UVEntities.Where(uve => 
                    uve.UserViewId == currUv.Id && uve.EntityId == e.Id
                ).Any()
            );

            var views = new [] { "FormView" };

            var entities = entitiesQuery.ToList();

            var userViews = db.UserViews.Where(uv =>
                views.Contains(uv.Name) && uv.Id != currUv.Id && db.UVEntities.Where(uve =>
                    uve.UserViewId == uv.Id && entitiesQuery.Where(e => e.Id == uve.EntityId).Any()
                ).Any()
            ).ToList();

            return new []
            {
                new { Name = "Сущность 1", Link = "../nav", Sub = new dynamic[] { } },
                new { Name = "Все", Link = "../uv/1", Sub = new dynamic[]
                        {
                            new { Name = "Представление", Link = "../uv/1" }
                        }
                    }
            };
        }

        public HomeModule(DatabaseContext db, UserDatabaseContext userDb)
        {        
            // ! Переписать авторизацию на авторизацию ненси и повесить защиту на остальные запросы
            Get("/", _ =>
            {
                return View["Authorization"];
            });

            Get("/nav/", _ =>
            {
                var model = new
                {
                    // ! Создаем модель выгружаем данные по сущностям из базы на основании доступов пользователя к этим сущностям
                    MenuCategories = db.MenuCategories
                                       .GroupJoin(db.Entities,
                                                  category => category.Id,
                                                  entity => entity.MenuCategoryId,
                                                  (category, entities) => new { Category = category, Entities = entities.ToList() })
                                       .ToList()
                };

                // Удаляем пустые менюкатегории (без Сущностей)
                model.MenuCategories.RemoveAll((mc) => { return mc.Entities.Count == 0; });

                return View["Navigator", model];
            });

            Get(@"/uv/{Id:int}/", pars =>
            {
                var id = (int)pars.Id;
                var uv = db.UserViews.First(u => u.Id == id);
                if(uv == null)
                {
                    throw new ArgumentException($"User view doesn't exist: {uv}");
                }

                // ! Переписать на динамический поиск через Reflection
                View view = null;
                switch (uv.Type)
                {
                    case "Table":
                        view = new TableView();
                        break;
                    case "Form":
                        view = new FormView();
                        break;
                    default:
                        throw new ArgumentException($"Unknown view type: {uv.Type}");
                }

                /*
                Создаем модель меню, берем данные из базы с доступами пользователя к сущности и юзервью
                Если модель не пустая {
                    Создаем модель данных, берем данные из базы с доступами пользователя к запис(и)ям и фильтрами из юзервью
                    Если модель не пустая {
                        Идем по всем полям сущности, используемым в текущем юзервью {
                            Проверяем доступ пользоваеля к полю {
                                Если нет доступа на чтение поля
                                    Помечаем, что поле не доступно для чтения (При выводе поменяем значения полей на "********")
                                Если тип юзервью позволяет редактирование
                                    Если поле недоступно для рекдактирования
                                        Помечаем запись в модели как недоступное для рекдактирования (При выводе сделаем не доступным для редактирования)
                            }
                        }
                        Если тип юзервью поддерживает сортировку {
                            Если есть параметр сортировка в ссылке
                                Сортируем по нему
                            Иначе (если параметра сортировка в ссылке нету)
                                Сортируем по дате создания записи - новые наверх
                        }
                    }
                } иначе (если модель пустая) {
                    Выводим страницу ошибки "У вас нет досутпа к этим данным"
                }

                Запускаем sshtml с выгруженной моделью меню и данных
                */
                dynamic tModel = view.Get(db, userDb, uv);
                tModel.MenuBar = this.GetMenuBar(db, userDb, uv);
                //throw new ArgumentException($"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!: {tModel.Titles[0].Name} !!!!!!!!!!");
                return View[view.ViewName, tModel];
            });
        }
    }
}
