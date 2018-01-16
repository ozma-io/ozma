namespace FunWithFlags.FunApp
{
    using System.Collections.Generic;
    using NGettext;
    
    using FunWithFlags.FunCore;
    using FunWithFlags.FunDB.Context;

    public struct ViewMenuItem
    {
        public string Name;
        public string Url;
    }

    public struct ViewMenu
    {
        public string Name;
        public IEnumerable<ViewMenuItem> Items;
    }

    public abstract class ViewResponse
    {
    }

    public class ViewPage : ViewResponse
    {
        public string Name;
        public IDictionary<string, object> Attributes;
        public IEnumerable<ViewMenu> Menus;
    }

    public class ViewRedirect : ViewResponse
    {
        public string Url;
    }

    public interface View
    {
        ViewResponse Get(Context ctx, ICatalog catalog, UserView uv, dynamic getPars);
        ViewResponse Post(Context ctx, ICatalog catalog, UserView uv, dynamic getPars, dynamic postPars);
    }
}
