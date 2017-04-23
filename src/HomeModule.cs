namespace FunWithFlags.FunApp
{
    using System;
    using System.Linq;
    using Nancy;

    using FunWithFlags.FunCore;
    using FunWithFlags.FunApp.Views;

    public class HomeModule : NancyModule
    {
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

                // ! Если Группа пользователя "Администраторы"
                    // Добавляем в модель захардкоженную меню категорию "Систменые" и системные сущности

                // ! Удаляем пустые менюкатегории (без Сущностей)
                for (int i = 0; i <= model.MenuCategories.Count; i++)
                {
                    //if (model.MenuCategories[i].Entities.Count == 0) {
                        model.MenuCategories.RemoveAt(i);
                    //}
                }

                return View["Navigator", model];
            });

            Get(@"/uv/{id:int}/", pars =>
            {
                var uv = db.UserViews.Find((int)pars.id);
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

                return View[view.ViewName, view.Get(db, userDb, uv)];
            });
        }
    }
}
