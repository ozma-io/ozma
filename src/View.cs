namespace FunWithFlags.FunApp
{
    using System.Collections.Generic;
    using NGettext;
    
    using FunWithFlags.FunCore;
    using FunWithFlags.FunDB.Context;

    [DotLiquid.LiquidType("Name", "Url")]
    public class ViewMenuItem
    {
        public string Name { get; set; }
        public string Url { get; set; }
    }

    [DotLiquid.LiquidType("Name", "Items")]
    public class ViewMenu
    {
        public string Name { get; set; }
        public IEnumerable<ViewMenuItem> Items { get; set; }
    }

    public abstract class ViewResponse
    {
    }

    public class ViewPage : ViewResponse
    {
        public string Name { get; set; }
        public IDictionary<string, object> Attributes { get; set; }
        public IEnumerable<ViewMenu> Menus { get; set; }
    }

    public class ViewRedirect : ViewResponse
    {
        public string Url { get; set; }
    }

    public interface IView
    {
        ViewResponse Get(Context ctx, ICatalog catalog, UserView uv, dynamic getPars);
        ViewResponse Post(Context ctx, ICatalog catalog, UserView uv, dynamic getPars, dynamic postPars);
    }
}
