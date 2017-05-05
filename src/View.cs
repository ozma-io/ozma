namespace FunWithFlags.FunApp
{
    using System.Dynamic;
    
    using FunWithFlags.FunCore;

    public interface View
    {
        string ViewName
        {
            get;
        }
        
        ExpandoObject Get(DatabaseContext db, UserDatabaseContext userDb, UserView uv);
    }
}
