# ListPagination narrow wrapping

Open `/?view=list-pagination&narrow=1` in the enterprise fixture.
Both footers are constrained to 240px; the inner page group wraps without horizontal overflow.

- `list-pagination-wrap-1440x900.png`
- `list-pagination-wrap-1920x1080.png`

Browser assertions confirmed `clientWidth === scrollWidth === 240`, default `flex-wrap: wrap`, and effective CSS overrides for 16px gap and nowrap.
