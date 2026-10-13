<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep food calculations, schemas, alert generation and executable test fixtures in a browser-safe domain module so UI and tests share the same rules.
- Use a hydrated React context with versioned localStorage for this explicitly local prototype; persist before updating state and display storage errors without claiming success.
- Keep shared navigation in the root shell and each content page in its own TanStack route with individual metadata.
- Aggregate quantities only within a selected unit; never sum mass, volume and portion counts.
