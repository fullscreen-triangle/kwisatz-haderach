// Agent Smith — the desk as a program of its own.
//
// Opens the console on server-2 in an app window (Edge or Chrome with --app: no tabs, no
// address bar, its own taskbar entry), so the desk is used without opening this project.
// The address is on the tailnet; when it does not answer, Tailscale is started and the
// address tried again, and only then does it say what is wrong.
//
//   AgentSmith.exe                 the console
//   AgentSmith.exe forms           /desk/forms   (any desk page by name, or a path)
//
// Built by tools/launcher/build.cmd with the C# compiler every Windows has (.NET Framework 4),
// so it is C# 5: no string interpolation, no ?. operator.

using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

static class AgentSmith
{
    const string Host = "https://server-2.tail48bcc9.ts.net";
    const string Home = "/desk/console";

    [STAThread]
    static int Main(string[] args)
    {
        ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;      // TLS 1.2
        string path = Home;
        if (args.Length > 0 && args[0].Trim().Length > 0)
        {
            string a = args[0].Trim();
            path = a.StartsWith("/") ? a : "/desk/" + a;
        }
        string url = Host + path;

        if (!Reachable(url))
        {
            StartTailscale();
            bool up = false;
            for (int i = 0; i < 10 && !up; i++)
            {
                Thread.Sleep(2000);
                up = Reachable(url);
            }
            if (!up)
            {
                MessageBox.Show(
                    "The desk does not answer at " + Host + ".\n\n" +
                    "Is Tailscale connected (the icon by the clock)? Server-2 is reached through it.\n" +
                    "If it is, the server may be restarting after a deploy: try again in a minute.",
                    "Agent Smith", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return 1;
            }
        }
        Open(url);
        return 0;
    }

    // Any HTTP answer counts: a 401 or 404 still means the server is there.
    static bool Reachable(string url)
    {
        try
        {
            var req = (HttpWebRequest)WebRequest.Create(url);
            req.Method = "HEAD";
            req.Timeout = 5000;
            req.AllowAutoRedirect = false;
            using (req.GetResponse()) { }
            return true;
        }
        catch (WebException e)
        {
            return e.Response != null;
        }
        catch (Exception)
        {
            return false;
        }
    }

    static void StartTailscale()
    {
        string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        string ipn = Path.Combine(pf, "Tailscale\\tailscale-ipn.exe");
        string cli = Path.Combine(pf, "Tailscale\\tailscale.exe");
        try { if (File.Exists(ipn)) Process.Start(ipn); } catch (Exception) { }
        try
        {
            if (File.Exists(cli))
            {
                var p = Process.Start(new ProcessStartInfo(cli, "up") { CreateNoWindow = true, UseShellExecute = false });
                if (p != null) p.WaitForExit(10000);
            }
        }
        catch (Exception) { }
    }

    static void Open(string url)
    {
        string pf86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
        string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string[] browsers = {
            Path.Combine(pf86, "Microsoft\\Edge\\Application\\msedge.exe"),
            Path.Combine(pf, "Microsoft\\Edge\\Application\\msedge.exe"),
            Path.Combine(pf, "Google\\Chrome\\Application\\chrome.exe"),
            Path.Combine(local, "Google\\Chrome\\Application\\chrome.exe"),
        };
        foreach (string b in browsers)
        {
            if (!File.Exists(b)) continue;
            try { Process.Start(b, "--app=\"" + url + "\""); return; } catch (Exception) { }
        }
        Process.Start(url);                                  // the default browser, as a tab
    }
}
