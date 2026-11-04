/**
 * Page content fades in over 200 ms on navigation. Done in CSS (opacity only) so the first paint never waits
 * for JavaScript; the template re-mounts on every navigation, which replays the fade.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-fade">{children}</div>;
}
