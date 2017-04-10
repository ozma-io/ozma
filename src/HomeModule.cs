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

            // ! Переписать функционал под ID разных формы, сюда же ID сущности, ID записи и параметры
            Get("/form", _ =>
            {
                /*
                Создаем модель, берем данные из базы с доступами пользователя к сущности и доступами пользователя к записи
                Если модель не пустая {
                    Идем по всем полям сущности {
                        Проверяем доступ пользоваеля к полю {
                            Если нед доступа на чтение
                                Помечаем, что поле не доступно для чтения (При выводе поменяем значения полей на "********")
                            Если недоступно для рекдактирования
                                Помечаем запись в модели как недоступное для рекдактирования
                        }
                    }
                } иначе (если модель пустая) {
                    Выводим страницу Ошибки "У вас нет досутпа к этим данным"
                }

                Запускаем sshtml с выгруженной и измененной моделью
                */

                return View["Form"];
            });

            // ! Переписать функционал под ID разных юзервью, сюда же ID сущности и параметры
            Get("/tabl", _ =>
            {
                /*
                Создаем модель, берем данные из базы с доступами пользователя к сущности и доступами пользователя к записям
                Если модель не пустая {
                    Идем по всем полям сущности {
                        Проверяем доступ пользоваеля к полю {
                            Если нед доступа на чтение
                                Помечаем, что поле не доступно для чтения (При выводе поменяем значения полей на "********")
                        }
                    }
                } иначе (если модель пустая) {
                    Выводим страницу Ошибки "У вас нет досутпа к этим данным"
                }

                Запускаем sshtml с выгруженной и измененной моделью
                */

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
