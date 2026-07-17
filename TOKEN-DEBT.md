# TOKEN-DEBT — Inventario del debito hardcoded (Fase A)

Generato automaticamente dall'audit CSS della Fase A (script in sessione, dati verificati
contro i valori risolti a runtime). Numeri di riga riferiti allo stato **pre-sostituzione**
(commit `50d1f19`); per panels.css ed editor-refactor.css lo **Stato** indica l'esito in Fase A4.

Legenda stato:
- **SOSTITUITO** — rimpiazzato con il token indicato, valore identico (A4).
- **RIMOSSO** — la riga apparteneva a un blocco `:root` legacy morto, eliminato (A4).
- **RESIDUO** — nessun token con valore esattamente identico: lasciato invariato (vedi motivazioni).
- **INVENTARIO** — file fuori dallo scope di sostituzione della Fase A; mappatura indicata.

## Riepilogo occorrenze colore per file

| File | Occorrenze | Sostituite (A4) | Rimosse con blocchi | Residue | Token esatto disponibile (fuori scope A4) |
|---|---:|---:|---:|---:|---:|
| src/index.css | 1213 | 0 | 0 | 1018 | 195 |
| src/styles/editor-refactor.css | 554 | 118 | 59 | 377 | 0 |
| src/styles/panels.css | 119 | 25 | 37 | 57 | 0 |
| src/styles/project-explorer.css | 20 | 0 | 0 | 15 | 5 |
| src/styles/workspace-shell.css | 18 | 0 | 0 | 10 | 8 |
| src/styles/activity-rail.css | 9 | 0 | 0 | 4 | 5 |
| src/styles/app-command-bar.css | 7 | 0 | 0 | 2 | 5 |
| src/styles/panels-workspace.css | 1 | 0 | 0 | 0 | 1 |
| src/styles/responsive.css | 1 | 0 | 0 | 1 | 0 |

## src/index.css

Vista aggregata per valore (1213 occorrenze; il dettaglio riga-per-riga e riproducibile con lo script d'audit).
Gran parte del file appartiene a sistemi tema legacy (`--ui-*`, `--unibo-*`, blocco editor blu) probabilmente
non piu raggiungibili dopo la rimozione del theme switcher: da verificare e potare in una fase dedicata.

| Valore | Occorrenze | Righe (prime 8) | Token / proposta | Stato |
|---|---:|---|---|---|
| `#ffffff` | 40 | 4, 5, 56, 95, 1638, 1693, 1887, 1895, ... | `var(--color-bg-elevated)` | INVENTARIO |
| `rgba(42,39,31,0.08)` | 26 | 4989, 5921, 5956, 6084, 6593, 6641, 6723, 6737, ... | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#171717` | 14 | 1100, 1101, 1113, 1497, 1516, 2520, 2595, 2616, ... | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.72)` | 13 | 1228, 2209, 2352, 3270, 3840, 3937, 4054, 4917, ... | `color-mix(--color-bg-elevated 72%)` | INVENTARIO |
| `rgba(42,39,31,0.1)` | 13 | 5855, 7179, 8399, 8453, 9752, 9824, 9883, 9959, ... | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fffef8` | 10 | 1102, 1498, 1515, 1517, 2442, 2521, 2596, 3585, ... | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(27,43,65,0.08)` | 10 | 10349, 10606, 10694, 10747, 10785, 10843, 10975, 11003, ... | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.92)` | 9 | 3088, 4752, 8591, 10051, 10313, 11004, 11056, 12141, ... | `color-mix(--color-bg-elevated 92%)` | INVENTARIO |
| `rgba(255,255,255,0.78)` | 8 | 1571, 1586, 1678, 4282, 4580, 7572, 9246, 12046 | `color-mix(--color-bg-elevated 78%)` | INVENTARIO |
| `rgba(255,255,255,0.12)` | 7 | 1736, 1894, 3830, 3861, 4293, 5081, 11718 | `color-mix(--color-bg-elevated 12%)` | INVENTARIO |
| `rgba(255,255,255,0.7)` | 7 | 3200, 3544, 4541, 5017, 8681, 9208, 10424 | `color-mix(--color-bg-elevated 70%)` | INVENTARIO |
| `rgba(27,43,65,0.1)` | 7 | 10422, 10592, 10654, 10772, 10895, 10954, 11049 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(21,21,18,0.12)` | 6 | 1026, 1187, 1218, 3006, 3188, 3614 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.88)` | 6 | 2280, 5111, 9105, 9579, 9826, 11027 | `color-mix(--color-bg-elevated 88%)` | INVENTARIO |
| `rgba(255,255,255,0.74)` | 6 | 3838, 3929, 4287, 4627, 7181, 9104 | `color-mix(--color-bg-elevated 74%)` | INVENTARIO |
| `#f8faf6` | 6 | 4065, 4294, 4300, 5066, 5082, 5086 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(39,48,43,0.68)` | 6 | 7634, 7810, 7832, 8019, 8062, 8135 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#151512` | 5 | 1008, 1252, 1302, 1324, 2963 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.68)` | 5 | 1078, 4435, 4665, 5174, 5331 | `color-mix(--color-bg-elevated 68%)` | INVENTARIO |
| `rgba(255,255,255,0.9)` | 5 | 1118, 7233, 7749, 8700, 9530 | `color-mix(--color-bg-elevated 90%)` | INVENTARIO |
| `rgba(255,255,255,0.56)` | 5 | 3077, 4345, 4493, 6609, 9321 | `color-mix(--color-bg-elevated 56%)` | INVENTARIO |
| `rgba(255,255,255,0.94)` | 5 | 3153, 6744, 10511, 11062, 11269 | `color-mix(--color-bg-elevated 94%)` | INVENTARIO |
| `rgba(187,46,41,0.12)` | 5 | 3777, 3880, 3886, 3909, 3928 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.72)` | 5 | 5826, 8380, 8387, 8448, 8831 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.58)` | 5 | 6882, 6892, 6956, 8655, 8769 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#101513` | 5 | 7518, 7916, 7952, 7968, 8144 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(34,44,40,0.14)` | 5 | 7537, 7731, 7788, 7826, 8219 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(27,43,65,0.12)` | 5 | 10310, 10389, 11015, 11026, 11061 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.58)` | 4 | 1112, 1862, 3108, 8824 | `color-mix(--color-bg-elevated 58%)` | INVENTARIO |
| `rgba(58,54,45,0.06)` | 4 | 1239, 1239, 3304, 3304 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.98)` | 4 | 1607, 9119, 10014, 11377 | `color-mix(--color-bg-elevated 98%)` | INVENTARIO |
| `rgba(255,255,255,0.62)` | 4 | 1616, 2218, 6642, 7615 | `color-mix(--color-bg-elevated 62%)` | INVENTARIO |
| `rgba(48,95,88,0.08)` | 4 | 2075, 8412, 8912, 8991 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#8f2419` | 4 | 2493, 2649, 6824, 6855 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(21,21,18,0.14)` | 4 | 3075, 3106, 3542, 3568 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(187,46,41,0.08)` | 4 | 3830, 3876, 3913, 3966 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(79,107,100,0.12)` | 4 | 3986, 3993, 4389, 4708 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,44,40,0.08)` | 4 | 3988, 4129, 4676, 5034 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(79,107,100,0.08)` | 4 | 4046, 4086, 4371, 4716 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#161c1a` | 4 | 5198, 5253, 6963, 6978 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.06)` | 4 | 5915, 5933, 9524, 9563 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#dfe3dc` | 4 | 7819, 8165, 12751, 12757 | `var(--color-bg-diagram-canvas)` | INVENTARIO |
| `rgba(255,255,255,0.96)` | 4 | 8264, 10594, 11328, 11470 | `color-mix(--color-bg-elevated 96%)` | INVENTARIO |
| `#1d4f91` | 4 | 10319, 10533, 10911, 11575 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#153d6f` | 4 | 10320, 10533, 10911, 11575 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(17,31,49,0.08)` | 4 | 10325, 10574, 10670, 11050 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(29,79,145,0.24)` | 4 | 10674, 10910, 10959, 11574 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#b5850a` | 3 | 19, 72, 73 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(61,122,110,0.25)` | 3 | 38, 5672, 5762 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#111111` | 3 | 1003, 1938, 1999 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.55)` | 3 | 1188, 1617, 1736 | `color-mix(--color-bg-elevated 55%)` | INVENTARIO |
| `rgba(21,21,18,0.1)` | 3 | 1238, 3268, 3302 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.8)` | 3 | 2059, 8867, 9511 | `color-mix(--color-bg-elevated 80%)` | INVENTARIO |
| `rgba(120,111,96,0.18)` | 3 | 2207, 2305, 2338 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#d2d2cc` | 3 | 2560, 2701, 2720 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(48,95,88,0.16)` | 3 | 2965, 9384, 9804 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(48,95,88,0.1)` | 3 | 3570, 8706, 8958 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.08)` | 3 | 3660, 4046, 5399 | `color-mix(--color-bg-elevated 8%)` | INVENTARIO |
| `rgba(79,107,100,0.16)` | 3 | 4014, 4041, 4076 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(79,107,100,0.18)` | 3 | 4053, 5342, 6400 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.2)` | 3 | 4292, 5080, 6378 | `color-mix(--color-bg-elevated 20%)` | INVENTARIO |
| `rgba(79,107,100,0.14)` | 3 | 4343, 6092, 6398 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.42)` | 3 | 4991, 6595, 9293 | `color-mix(--color-bg-elevated 42%)` | INVENTARIO |
| `rgba(255,255,255,0.25)` | 3 | 5700, 5710, 5780 | `color-mix(--color-bg-elevated 25%)` | INVENTARIO |
| `rgba(255,255,255,0.66)` | 3 | 5860, 5922, 8368 | `color-mix(--color-bg-elevated 66%)` | INVENTARIO |
| `rgba(255,255,255,0.76)` | 3 | 6739, 9642, 10391 | `color-mix(--color-bg-elevated 76%)` | INVENTARIO |
| `#ece9df` | 3 | 7238, 7272, 7331 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(0,0,0,0.98)` | 3 | 7264, 7350, 8808 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fbfcfa` | 3 | 7285, 7517, 7528 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,71,116,0.9)` | 3 | 7447, 7997, 8200 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.82)` | 3 | 8355, 9034, 9873 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.62)` | 3 | 8362, 8724, 8778 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(48,95,88,0.12)` | 3 | 8734, 9113, 9118 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(133,84,35,0.92)` | 3 | 9285, 9685, 9923 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(138,48,34,0.94)` | 3 | 9690, 9810, 9933 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f5f7f4` | 2 | 1, 11799 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#1a1f1c` | 2 | 11, 58 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#c44536` | 2 | 17, 71 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#2a8a5f` | 2 | 21, 70 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(26,31,28,0.04)` | 2 | 35, 36 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(181,133,10,0.12)` | 2 | 67, 314 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#64748b` | 2 | 124, 166 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(181,133,10,0.22)` | 2 | 132, 195 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(21,21,18,0.16)` | 2 | 1077, 3146 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fbf8ef` | 2 | 1239, 3304 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fffdf7` | 2 | 1253, 1304 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,254,248,0.68)` | 2 | 1511, 3594 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f0ebe1` | 2 | 1522, 3605 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,245,237,0.84)` | 2 | 1534, 9221 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(17,17,17,0.18)` | 2 | 1639, 1889 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#44443f` | 2 | 1813, 2390 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#d3d3ce` | 2 | 1893, 2606 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f0f0eb` | 2 | 1920, 1964 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.82)` | 2 | 2013, 4594 | `color-mix(--color-bg-elevated 82%)` | INVENTARIO |
| `#f7f3e8` | 2 | 2189, 3522 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.04)` | 2 | 2195, 3517 | `color-mix(--color-bg-elevated 4%)` | INVENTARIO |
| `rgba(255,255,255,0.54)` | 2 | 2282, 9614 | `color-mix(--color-bg-elevated 54%)` | INVENTARIO |
| `rgba(120,111,96,0.16)` | 2 | 2350, 2361 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#55554f` | 2 | 2357, 2688 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(0,0,0,0.08)` | 2 | 2443, 7410 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f9f8f2` | 2 | 2532, 2607 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fcfcf8` | 2 | 2702, 2721 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#dfdfd8` | 2 | 2711, 2733 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.6)` | 2 | 3147, 5533 | `color-mix(--color-bg-elevated 60%)` | INVENTARIO |
| `rgba(48,95,88,0.18)` | 2 | 3319, 8962 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f8f2e5` | 2 | 3343, 3618 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(187,46,41,0.16)` | 2 | 3798, 3866 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(187,46,41,0.18)` | 2 | 3825, 3837 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(187,46,41,0.04)` | 2 | 3830, 3880 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fffdfb` | 2 | 3849, 3950 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.16)` | 2 | 3880, 4251 | `color-mix(--color-bg-elevated 16%)` | INVENTARIO |
| `#fffdfa` | 2 | 3887, 3989 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(187,46,41,0.14)` | 2 | 3935, 3956 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(187,46,41,0.2)` | 2 | 3961, 3970 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(249,251,247,0.84)` | 2 | 3978, 6725 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(252,253,250,0.94)` | 2 | 3979, 4371 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#22302c` | 2 | 3982, 3991 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.84)` | 2 | 4056, 9872 | `color-mix(--color-bg-elevated 84%)` | INVENTARIO |
| `rgba(57,81,75,0.22)` | 2 | 4066, 5067 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#2d423d` | 2 | 4072, 5071 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(79,107,100,0.06)` | 2 | 4077, 5147 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(249,251,247,0.82)` | 2 | 4333, 5094 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(79,107,100,0.26)` | 2 | 4350, 5023 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(184,138,91,0.28)` | 2 | 4397, 4685 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fffaf4` | 2 | 4399, 5029 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(79,107,100,0.28)` | 2 | 4586, 4637 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.85)` | 2 | 5107, 8401 | `color-mix(--color-bg-elevated 85%)` | INVENTARIO |
| `rgba(79,107,100,0.2)` | 2 | 5195, 6964 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.06)` | 2 | 5208, 5231 | `color-mix(--color-bg-elevated 6%)` | INVENTARIO |
| `#111614` | 2 | 5209, 5230 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.52)` | 2 | 5856, 9348 | `color-mix(--color-bg-elevated 52%)` | INVENTARIO |
| `rgba(42,39,31,0.52)` | 2 | 5991, 6844 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.04)` | 2 | 6664, 9561 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.68)` | 2 | 6761, 8978 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.78)` | 2 | 6813, 6924 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.5)` | 2 | 6820, 6931 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(47,42,31,0.08)` | 2 | 7182, 9108 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#243d34` | 2 | 7311, 7318 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(32,29,24,0.88)` | 2 | 7346, 7355 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(34,44,40,0.18)` | 2 | 7515, 7746 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(39,48,43,0.72)` | 2 | 7550, 7735 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(34,109,87,0.1)` | 2 | 7605, 7651 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(19,82,64,0.94)` | 2 | 7606, 7652 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,47,42,0.16)` | 2 | 7858, 8003 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(31,43,38,0.92)` | 2 | 7887, 7901 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(34,109,87,0.12)` | 2 | 7964, 8078 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(18,80,62,0.94)` | 2 | 7980, 8054 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(31,43,38,0.86)` | 2 | 7987, 7993 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(48,95,88,0.34)` | 2 | 8411, 8705 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.66)` | 2 | 8427, 9073 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.86)` | 2 | 8455, 9526 | `color-mix(--color-bg-elevated 86%)` | INVENTARIO |
| `rgba(42,39,31,0.86)` | 2 | 8459, 8660 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(29,29,25,0.92)` | 2 | 8717, 9065 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(160,62,47,0.18)` | 2 | 8930, 9038 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.56)` | 2 | 9027, 9112 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(160,62,47,0.06)` | 2 | 9039, 9667 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.16)` | 2 | 9102, 9612 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(250,249,244,0.92)` | 2 | 9106, 9885 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(250,249,244,0.94)` | 2 | 9412, 9448 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(37,74,68,0.94)` | 2 | 9607, 9793 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(58,54,45,0.045)` | 2 | 9708, 9708 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(31,67,61,0.96)` | 2 | 9805, 10013 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,249,239,0.92)` | 2 | 10071, 11041 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#edf2f7` | 2 | 10312, 10329 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(246,249,252,0.94)` | 2 | 10314, 10955 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(29,79,145,0.12)` | 2 | 10321, 11645 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(246,249,252,0.92)` | 2 | 10350, 10977 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#8a5516` | 2 | 10438, 10878 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(29,79,145,0.2)` | 2 | 10547, 11009 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(243,247,252,0.94)` | 2 | 10559, 10897 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(17,31,49,0.12)` | 2 | 10595, 11501 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,250,253,0.96)` | 2 | 10774, 10786 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(244,247,251,0.94)` | 2 | 11164, 11289 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(251,252,254,0.98)` | 2 | 11383, 11398 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#2f7353` | 2 | 11817, 13205 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(37,79,72,0.2)` | 2 | 11829, 12024 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#eef4f0` | 2 | 11858, 13165 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fbfcfb` | 2 | 12879, 12891 | `var(--color-bg-editor)` | INVENTARIO |
| `#fafbf9` | 1 | 3 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f0f2ef` | 1 | 6 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#e2e6e0` | 1 | 7 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#c5ccc3` | 1 | 8 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#5c6660` | 1 | 12 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#8a938d` | 1 | 13 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#3d7a6e` | 1 | 14 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#2d5c53` | 1 | 15 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(61,122,110,0.1)` | 1 | 16 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(196,69,54,0.08)` | 1 | 18 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(181,133,10,0.08)` | 1 | 20 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,138,95,0.08)` | 1 | 22 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(26,31,28,0.06)` | 1 | 36 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(26,31,28,0.08)` | 1 | 37 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(26,31,28,0.12)` | 1 | 37 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#2c3530` | 1 | 57 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fafcf9` | 1 | 59 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(44,53,48,0.04)` | 1 | 60 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(61,122,110,0.08)` | 1 | 63 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(196,69,54,0.1)` | 1 | 69 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#d97706` | 1 | 94 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#b45309` | 1 | 120 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#e0f2fe` | 1 | 176 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#0369a1` | 1 | 177 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(181,133,10,0.26)` | 1 | 378 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,138,95,0.24)` | 1 | 384 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(181,133,10,0.32)` | 1 | 391 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(61,122,110,0.22)` | 1 | 413 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(61,122,110,0.3)` | 1 | 516 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(0,0,0,0.06)` | 1 | 527 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f5efe4` | 1 | 1009 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#ece6da` | 1 | 1009 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#e7e1d7` | 1 | 1009 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(190,115,54,0.14)` | 1 | 1009 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(77,101,84,0.18)` | 1 | 1009 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(245,239,228,0.86)` | 1 | 1025 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#605c50` | 1 | 1052 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#2b2a27` | 1 | 1107 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(21,21,18,0.2)` | 1 | 1111 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#3f3c34` | 1 | 1168 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#4f4b41` | 1 | 1202 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(27,25,19,0.08)` | 1 | 1219 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f4eee2` | 1 | 1239 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(251,248,239,0.92)` | 1 | 1360 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(67,91,77,0.9)` | 1 | 1380 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(40,57,47,0.95)` | 1 | 1380 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f7f2e7` | 1 | 1381 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(247,242,231,0.78)` | 1 | 1394 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(247,242,231,0.18)` | 1 | 1408 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(176,95,39,0.92)` | 1 | 1482 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(137,71,27,0.96)` | 1 | 1482 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fff7ef` | 1 | 1483 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,247,239,0.9)` | 1 | 1487 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,247,239,0.8)` | 1 | 1491 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#595953` | 1 | 1558 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(23,23,20,0.22)` | 1 | 1608 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f3f3ee` | 1 | 1721 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#777772` | 1 | 1725 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(216,208,193,0.12)` | 1 | 1736 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#7e7e79` | 1 | 1872 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f8f8f5` | 1 | 1873 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(52,92,79,0.08)` | 1 | 2085 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,245,235,0.86)` | 1 | 2085 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(240,236,224,0.92)` | 1 | 2085 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#4e4a41` | 1 | 2114 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#282723` | 1 | 2132 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#c5c0b4` | 1 | 2146 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.75)` | 1 | 2147 | `color-mix(--color-bg-elevated 75%)` | INVENTARIO |
| `#545044` | 1 | 2151 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#a33a2b` | 1 | 2156 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fff3f0` | 1 | 2157 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#6a241d` | 1 | 2158 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(23,23,20,0.8)` | 1 | 2186 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#171714` | 1 | 2188 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f1d28a` | 1 | 2199 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#4d483e` | 1 | 2242 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(23,23,20,0.76)` | 1 | 2249 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#1b1a17` | 1 | 2251 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f4efdf` | 1 | 2252 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#464640` | 1 | 2273 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(246,246,241,0.8)` | 1 | 2307 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#4f4f49` | 1 | 2309 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#5c5c56` | 1 | 2331 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(243,243,239,0.84)` | 1 | 2337 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#474742` | 1 | 2340 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(251,251,248,0.84)` | 1 | 2363 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.65)` | 1 | 2366 | `color-mix(--color-bg-elevated 65%)` | INVENTARIO |
| `rgba(120,111,96,0.14)` | 1 | 2387 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(244,244,239,0.86)` | 1 | 2393 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(239,239,232,0.96)` | 1 | 2420 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#161616` | 1 | 2439 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fff9e9` | 1 | 2442 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fff6f4` | 1 | 2447 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#ffe9e4` | 1 | 2447 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#b1362c` | 1 | 2448 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#ac6d0a` | 1 | 2452 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#8a5600` | 1 | 2487 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,242,205,0.9)` | 1 | 2488 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,227,220,0.92)` | 1 | 2494 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(18,18,16,0.5)` | 1 | 2515 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(0,0,0,0.3)` | 1 | 2522 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#d4d4ce` | 1 | 2531 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#ecebe4` | 1 | 2532 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f9f9f4` | 1 | 2561 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(18,18,16,0.42)` | 1 | 2590 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(0,0,0,0.25)` | 1 | 2597 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#efeee8` | 1 | 2607 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#5d5d58` | 1 | 2716 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f7f1e7` | 1 | 2965 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#eee5d6` | 1 | 2965 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#e6ddd0` | 1 | 2965 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(190,115,54,0.18)` | 1 | 2965 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(78,108,95,0.28)` | 1 | 2987 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(176,95,39,0.22)` | 1 | 2993 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(247,241,231,0.78)` | 1 | 3007 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#666152` | 1 | 3047 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(23,23,20,0.24)` | 1 | 3089 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fffdf8` | 1 | 3136 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(17,17,17,0.16)` | 1 | 3137 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#2a2926` | 1 | 3142 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(41,35,24,0.09)` | 1 | 3190 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#49443a` | 1 | 3242 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,244,236,0.78)` | 1 | 3270 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#565145` | 1 | 3282 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f3ecdf` | 1 | 3304 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(62,87,76,0.94)` | 1 | 3342 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(31,46,39,0.98)` | 1 | 3342 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,242,229,0.76)` | 1 | 3357 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,242,229,0.16)` | 1 | 3371 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,242,229,0.92)` | 1 | 3373 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(177,109,59,0.94)` | 1 | 3377 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(143,83,38,0.98)` | 1 | 3377 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fff6ea` | 1 | 3378 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,246,234,0.92)` | 1 | 3391 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,246,234,0.8)` | 1 | 3395 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,242,229,0.74)` | 1 | 3399 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#4c473d` | 1 | 3490 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(25,25,23,0.98)` | 1 | 3498 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,34,31,0.98)` | 1 | 3498 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f6f0e3` | 1 | 3499 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(246,240,227,0.16)` | 1 | 3515 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(246,240,227,0.78)` | 1 | 3526 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#254942` | 1 | 3574 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#25231e` | 1 | 3584 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#355e57` | 1 | 3584 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(19,19,18,0.96)` | 1 | 3616 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(41,35,24,0.14)` | 1 | 3617 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,242,229,0.72)` | 1 | 3640 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,242,229,0.94)` | 1 | 3645 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,242,229,0.82)` | 1 | 3655 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,242,229,0.18)` | 1 | 3659 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,242,229,0.64)` | 1 | 3664 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#bb2e29` | 1 | 3774 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#982522` | 1 | 3775 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#7a1919` | 1 | 3776 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#6d6e71` | 1 | 3778 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#53565a` | 1 | 3779 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#2c2121` | 1 | 3780 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#efe4e1` | 1 | 3781 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,251,249,0.84)` | 1 | 3782 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,252,250,0.96)` | 1 | 3783 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(83,86,90,0.2)` | 1 | 3784 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(83,86,90,0.82)` | 1 | 3785 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#645d5c` | 1 | 3787 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(90,48,44,0.14)` | 1 | 3790 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#faf5f2` | 1 | 3798 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f0e5e2` | 1 | 3798 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#ebddda` | 1 | 3798 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(109,110,113,0.14)` | 1 | 3798 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(122,25,25,0.22)` | 1 | 3850 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.18)` | 1 | 3860 | `color-mix(--color-bg-elevated 18%)` | INVENTARIO |
| `rgba(187,46,41,0.06)` | 1 | 3867 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(83,86,90,0.18)` | 1 | 3871 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,251,249,0.96)` | 1 | 3872 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f6ece8` | 1 | 3887 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(187,46,41,0.05)` | 1 | 3887 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(109,110,113,0.06)` | 1 | 3887 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(90,48,44,0.08)` | 1 | 3900 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(187,46,41,0.1)` | 1 | 3918 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(252,248,245,0.9)` | 1 | 3918 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(245,238,235,0.94)` | 1 | 3918 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(187,46,41,0.86)` | 1 | 3924 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fff7f5` | 1 | 3944 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fee8e4` | 1 | 3944 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(187,46,41,0.24)` | 1 | 3949 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(90,48,44,0.24)` | 1 | 3951 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fff9f7` | 1 | 3957 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f3e8e5` | 1 | 3957 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(90,48,44,0.16)` | 1 | 3971 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#edf0ea` | 1 | 3976 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#e4e8e0` | 1 | 3977 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(51,68,63,0.14)` | 1 | 3980 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(36,52,48,0.34)` | 1 | 3981 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#64716c` | 1 | 3983 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#4f6b64` | 1 | 3984 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#39514b` | 1 | 3985 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#b88a5b` | 1 | 3987 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#5f7f77` | 1 | 3990 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f6f8f5` | 1 | 3992 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#70847d` | 1 | 3994 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(79,107,100,0.09)` | 1 | 3995 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#7d9f96` | 1 | 3996 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#5d7d75` | 1 | 3997 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(93,125,117,0.14)` | 1 | 3998 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#c08d5a` | 1 | 3999 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#b67f43` | 1 | 4000 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(182,127,67,0.18)` | 1 | 4001 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#b24d34` | 1 | 4002 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(178,77,52,0.2)` | 1 | 4003 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f7f8f4` | 1 | 4005 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f8f8f3` | 1 | 4014 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#eef0ea` | 1 | 4014 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#e6e8e1` | 1 | 4014 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(184,138,91,0.12)` | 1 | 4014 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(79,107,100,0.03)` | 1 | 4046 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fffefb` | 1 | 4116 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f4f6f0` | 1 | 4116 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(79,107,100,0.1)` | 1 | 4251 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(79,107,100,0.04)` | 1 | 4251 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.64)` | 1 | 4281 | `color-mix(--color-bg-elevated 64%)` | INVENTARIO |
| `rgba(51,68,63,0.22)` | 1 | 4286 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#eff3ed` | 1 | 4300 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(125,159,150,0.22)` | 1 | 4306 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,250,246,0.92)` | 1 | 4319 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,44,40,0.12)` | 1 | 4353 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(125,159,150,0.14)` | 1 | 4353 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(242,246,240,0.94)` | 1 | 4371 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(184,138,91,0.14)` | 1 | 4393 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f7ede2` | 1 | 4399 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(247,250,246,0.9)` | 1 | 4565 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(79,107,100,0.3)` | 1 | 4600 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,44,40,0.05)` | 1 | 4632 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,44,40,0.1)` | 1 | 4638 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,249,242,0.88)` | 1 | 4686 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(190,164,107,0.24)` | 1 | 4690 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,251,239,0.88)` | 1 | 4691 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,44,40,0.18)` | 1 | 4740 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,44,40,0.28)` | 1 | 4745 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(242,246,240,0.92)` | 1 | 4752 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,44,40,0.14)` | 1 | 4871 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.48)` | 1 | 4908 | `color-mix(--color-bg-elevated 48%)` | INVENTARIO |
| `rgba(182,127,67,0.28)` | 1 | 4926 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,249,240,0.94)` | 1 | 4927 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(247,236,216,0.96)` | 1 | 4927 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#6e4a23` | 1 | 4928 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(182,127,67,0.14)` | 1 | 4932 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(60,133,89,0.3)` | 1 | 4937 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(244,255,248,0.96)` | 1 | 4938 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(228,248,236,0.98)` | 1 | 4938 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#2d6644` | 1 | 4939 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(60,133,89,0.14)` | 1 | 4943 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#2f6f49` | 1 | 4944 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(178,77,52,0.3)` | 1 | 4948 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,247,243,0.96)` | 1 | 4949 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(249,233,225,0.98)` | 1 | 4949 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#7d3928` | 1 | 4950 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(178,77,52,0.12)` | 1 | 4954 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f6fbf7` | 1 | 5024 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#edf5ef` | 1 | 5024 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(184,138,91,0.24)` | 1 | 5028 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f7ede1` | 1 | 5029 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f1f4ee` | 1 | 5086 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(243,247,242,0.88)` | 1 | 5111 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(252,253,250,0.96)` | 1 | 5147 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(245,248,243,0.96)` | 1 | 5147 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.03)` | 1 | 5199 | `color-mix(--color-bg-elevated 3%)` | INVENTARIO |
| `rgba(231,238,233,0.8)` | 1 | 5210 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(200,213,206,0.45)` | 1 | 5243 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f1c59a` | 1 | 5247 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#edf1ed` | 1 | 5273 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f1f4ef` | 1 | 5289 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(118,183,240,0.26)` | 1 | 5300 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#76b7f0` | 1 | 5304 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#d5c88f` | 1 | 5308 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#7f9488` | 1 | 5312 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#e7ece8` | 1 | 5317 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#b9d7bb` | 1 | 5321 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(247,250,246,0.92)` | 1 | 5344 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.4)` | 1 | 5399 | `color-mix(--color-bg-elevated 40%)` | INVENTARIO |
| `rgba(223,217,204,0.08)` | 1 | 5399 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(250,251,249,0.85)` | 1 | 5416 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.46)` | 1 | 5850 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,245,237,0.48)` | 1 | 5864 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(17,17,17,0.12)` | 1 | 5874 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.38)` | 1 | 5917 | `color-mix(--color-bg-elevated 38%)` | INVENTARIO |
| `rgba(248,245,237,0.44)` | 1 | 5932 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(252,253,250,0.98)` | 1 | 5957 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,44,40,0.16)` | 1 | 5958 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.07)` | 1 | 5984 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(79,107,100,0.42)` | 1 | 6091 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(61,122,110,0.2)` | 1 | 6352 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.3)` | 1 | 6379 | `color-mix(--color-bg-elevated 30%)` | INVENTARIO |
| `rgba(255,255,255,0.5)` | 1 | 6518 | `color-mix(--color-bg-elevated 50%)` | INVENTARIO |
| `rgba(252,250,245,0.36)` | 1 | 6629 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.03)` | 1 | 6630 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(47,42,31,0.06)` | 1 | 6726 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(249,251,247,0.72)` | 1 | 6760 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(249,251,247,0.74)` | 1 | 6776 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(250,248,243,0.95)` | 1 | 6793 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(246,243,235,0.96)` | 1 | 6793 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(28,27,23,0.9)` | 1 | 6878 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(247,250,245,0.95)` | 1 | 6904 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(239,246,238,0.96)` | 1 | 6904 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(28,27,23,0.92)` | 1 | 6952 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(184,138,91,0.3)` | 1 | 6969 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#ffd2a7` | 1 | 7011 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(118,183,240,0.22)` | 1 | 7015 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.74)` | 1 | 7194 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(193,108,52,0.32)` | 1 | 7224 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(250,242,230,0.92)` | 1 | 7226 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#5e442e` | 1 | 7227 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(94,68,46,0.28)` | 1 | 7231 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(21,18,15,0.82)` | 1 | 7255 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(12,11,10,0.9)` | 1 | 7260 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(33,28,22,0.72)` | 1 | 7270 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#707a73` | 1 | 7286 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#35564f` | 1 | 7291 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#0e1612` | 1 | 7303 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#eef5f0` | 1 | 7310 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f3f8f5` | 1 | 7317 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(18,16,13,0.76)` | 1 | 7329 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f5f4ed` | 1 | 7330 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(18,16,13,0.88)` | 1 | 7336 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f8f7f1` | 1 | 7337 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(0,0,0,0.96)` | 1 | 7341 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(33,28,22,0.14)` | 1 | 7384 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#171512` | 1 | 7393 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(0,0,0,0.035)` | 1 | 7406 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(18,17,15,0.96)` | 1 | 7416 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(9,86,72,0.95)` | 1 | 7438 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(9,86,72,0.16)` | 1 | 7442 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(9,86,72,0.45)` | 1 | 7443 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,71,116,0.16)` | 1 | 7451 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,71,116,0.4)` | 1 | 7452 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(140,84,24,0.92)` | 1 | 7456 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(140,84,24,0.16)` | 1 | 7460 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(140,84,24,0.42)` | 1 | 7461 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(94,42,28,0.9)` | 1 | 7465 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(94,42,28,0.16)` | 1 | 7469 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(94,42,28,0.4)` | 1 | 7470 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(41,37,30,0.72)` | 1 | 7490 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(94,68,46,0.88)` | 1 | 7495 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(16,21,18,0.42)` | 1 | 7505 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(17,24,20,0.28)` | 1 | 7519 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(31,75,65,0.92)` | 1 | 7559 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(34,44,40,0.16)` | 1 | 7570 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(26,34,30,0.82)` | 1 | 7573 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(54,72,64,0.16)` | 1 | 7595 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,249,246,0.78)` | 1 | 7598 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(44,52,48,0.72)` | 1 | 7599 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(34,109,87,0.25)` | 1 | 7604 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(39,54,49,0.14)` | 1 | 7612 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(153,94,38,0.22)` | 1 | 7640 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(153,94,38,0.08)` | 1 | 7643 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(112,67,24,0.94)` | 1 | 7644 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(34,109,87,0.24)` | 1 | 7650 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(43,58,52,0.16)` | 1 | 7665 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(252,253,251,0.86)` | 1 | 7668 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(31,86,73,0.28)` | 1 | 7674 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,252,249,0.98)` | 1 | 7675 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(24,105,86,0.58)` | 1 | 7679 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(34,109,87,0.09)` | 1 | 7680 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(24,105,86,0.38)` | 1 | 7681 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(39,48,43,0.7)` | 1 | 7703 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,66,58,0.2)` | 1 | 7712 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,50,46,0.68)` | 1 | 7714 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,50,46,0.54)` | 1 | 7720 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(26,34,30,0.88)` | 1 | 7750 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(24,105,86,0.5)` | 1 | 7756 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(24,105,86,0.94)` | 1 | 7757 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(34,44,40,0.12)` | 1 | 7762 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(34,44,40,0.08)` | 1 | 7763 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(39,48,43,0.42)` | 1 | 7764 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(31,75,65,0.82)` | 1 | 7797 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(251,252,250,0.82)` | 1 | 7827 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(237,241,235,0.7)` | 1 | 7860 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(223,227,220,0.82)` | 1 | 7871 | `color-mix(--color-bg-diagram-canvas 82%)` | INVENTARIO |
| `rgba(34,45,40,0.8)` | 1 | 7875 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(246,249,245,0.92)` | 1 | 7886 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(232,242,237,0.96)` | 1 | 7892 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(245,247,242,0.9)` | 1 | 7896 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(246,249,245,0.96)` | 1 | 7900 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(29,103,84,0.9)` | 1 | 7906 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,71,116,0.86)` | 1 | 7910 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,50,46,0.62)` | 1 | 7928 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(246,249,245,0.94)` | 1 | 7933 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(31,43,38,0.9)` | 1 | 7934 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(226,234,228,0.95)` | 1 | 7939 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(219,239,231,0.98)` | 1 | 7943 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(31,43,38,0.72)` | 1 | 7947 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(250,252,249,0.76)` | 1 | 7958 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(31,43,38,0.16)` | 1 | 7959 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(31,92,77,0.16)` | 1 | 7974 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(31,92,77,0.34)` | 1 | 7975 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(251,252,250,0.94)` | 1 | 8006 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,47,42,0.12)` | 1 | 8015 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,47,42,0.08)` | 1 | 8033 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(34,109,87,0.08)` | 1 | 8042 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(31,92,77,0.14)` | 1 | 8053 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(24,35,30,0.92)` | 1 | 8072 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(24,105,86,0.42)` | 1 | 8077 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(31,92,77,0.2)` | 1 | 8088 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(31,92,77,0.08)` | 1 | 8091 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(22,82,65,0.95)` | 1 | 8092 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,47,42,0.14)` | 1 | 8114 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(251,252,250,0.86)` | 1 | 8116 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(39,48,43,0.78)` | 1 | 8159 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(78,121,113,0.14)` | 1 | 8249 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(24,56,52,0.92)` | 1 | 8253 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(39,54,49,0.24)` | 1 | 8262 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(24,33,30,0.24)` | 1 | 8265 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(27,36,33,0.86)` | 1 | 8279 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(44,66,60,0.24)` | 1 | 8283 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,251,249,0.94)` | 1 | 8285 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(34,44,40,0.82)` | 1 | 8295 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(84,58,39,0.86)` | 1 | 8314 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(35,53,48,0.2)` | 1 | 8325 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(248,251,249,0.96)` | 1 | 8327 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(38,72,65,0.46)` | 1 | 8333 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(64,110,101,0.14)` | 1 | 8334 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(252,250,245,0.9)` | 1 | 8343 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.76)` | 1 | 8435 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(135,99,57,0.95)` | 1 | 8479 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(154,58,43,0.95)` | 1 | 8483 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(15,23,42,0.12)` | 1 | 8523 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(52,112,145,0.38)` | 1 | 8571 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(90,154,191,0.1)` | 1 | 8572 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(54,128,92,0.34)` | 1 | 8576 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(86,158,115,0.1)` | 1 | 8577 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(54,128,92,0.42)` | 1 | 8595 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#1e5c3e` | 1 | 8596 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(232,249,238,0.98)` | 1 | 8597 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(48,95,88,0.22)` | 1 | 8699 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(184,123,62,0.22)` | 1 | 8710 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(48,95,88,0.36)` | 1 | 8733 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(24,56,52,0.94)` | 1 | 8735 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(250,247,239,0.74)` | 1 | 8753 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.9)` | 1 | 8783 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(45,72,67,0.16)` | 1 | 8839 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(245,250,248,0.84)` | 1 | 8841 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(23,38,35,0.92)` | 1 | 8846 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(39,54,49,0.74)` | 1 | 8851 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.12)` | 1 | 8865 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(37,53,49,0.16)` | 1 | 8875 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(246,249,247,0.96)` | 1 | 8877 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(20,31,28,0.92)` | 1 | 8878 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(49,46,39,0.66)` | 1 | 8887 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(37,74,68,0.9)` | 1 | 8913 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(126,120,103,0.12)` | 1 | 8918 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(68,66,58,0.86)` | 1 | 8919 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(184,123,62,0.16)` | 1 | 8924 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(48,95,88,0.32)` | 1 | 8957 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(28,28,23,0.94)` | 1 | 8969 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(33,33,29,0.82)` | 1 | 8982 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(37,74,68,0.88)` | 1 | 8998 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(33,33,29,0.84)` | 1 | 9003 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(120,43,31,0.94)` | 1 | 9040 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(184,123,62,0.18)` | 1 | 9044 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(184,123,62,0.06)` | 1 | 9045 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(250,248,242,0.88)` | 1 | 9103 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0.95)` | 1 | 9107 | `color-mix(--color-bg-elevated 95%)` | INVENTARIO |
| `rgba(33,30,24,0.12)` | 1 | 9109 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(29,27,22,0.92)` | 1 | 9110 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.7)` | 1 | 9111 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(184,123,62,0.12)` | 1 | 9114 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(184,123,62,0.2)` | 1 | 9115 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(160,62,47,0.12)` | 1 | 9116 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(160,62,47,0.2)` | 1 | 9117 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(34,39,37,0.94)` | 1 | 9120 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(44,90,83,0.26)` | 1 | 9121 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(34,39,37,0.16)` | 1 | 9186 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(20,23,22,0.14)` | 1 | 9189 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,255,255,0)` | 1 | 9208 | `color-mix(--color-bg-elevated 0%)` | INVENTARIO |
| `rgba(247,244,236,0.96)` | 1 | 9208 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(240,242,236,0.92)` | 1 | 9208 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(247,244,238,0.92)` | 1 | 9278 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(42,39,31,0.05)` | 1 | 9291 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(249,246,240,0.84)` | 1 | 9329 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(250,249,244,0.98)` | 1 | 9360 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(250,249,244,0.74)` | 1 | 9479 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(250,249,244,0.76)` | 1 | 9526 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(250,249,244,0.82)` | 1 | 9530 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(244,249,244,0.84)` | 1 | 9579 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#faf8f2` | 1 | 9708 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f3f4ee` | 1 | 9708 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(250,249,244,0.9)` | 1 | 9754 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(26,25,20,0.94)` | 1 | 9769 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(133,84,35,0.94)` | 1 | 9799 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,248,238,0.94)` | 1 | 9840 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(127,89,45,0.08)` | 1 | 9841 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(133,84,35,0.84)` | 1 | 9855 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(66,44,20,0.9)` | 1 | 9862 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,249,239,0.94)` | 1 | 9918 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,246,242,0.95)` | 1 | 9928 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(37,74,68,0.92)` | 1 | 9938 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(250,249,244,0.86)` | 1 | 9961 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(250,249,244,0.88)` | 1 | 9987 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(250,249,244,0.84)` | 1 | 10003 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#1f2f2b` | 1 | 10033 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(245,248,243,0.92)` | 1 | 10051 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,246,242,0.94)` | 1 | 10076 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(27,43,65,0.2)` | 1 | 10311 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(226,236,249,0.98)` | 1 | 10315 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#13253d` | 1 | 10316 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(19,37,61,0.86)` | 1 | 10317 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(19,37,61,0.62)` | 1 | 10318 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(39,113,88,0.12)` | 1 | 10322 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(181,117,36,0.14)` | 1 | 10323 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(173,60,45,0.14)` | 1 | 10324 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f4f7fb` | 1 | 10329 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(208,220,236,0.58)` | 1 | 10329 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(181,117,36,0.18)` | 1 | 10436 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(255,248,238,0.9)` | 1 | 10437 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(17,31,49,0.04)` | 1 | 10457 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(17,31,49,0.06)` | 1 | 10512 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(29,79,145,0.28)` | 1 | 10527 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(21,61,111,0.26)` | 1 | 10532 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(21,61,111,0.2)` | 1 | 10535 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(21,61,111,0.34)` | 1 | 10539 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#21589f` | 1 | 10540 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#16457d` | 1 | 10540 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(17,31,49,0.05)` | 1 | 10659 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(234,242,251,0.98)` | 1 | 10675 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(247,250,254,0.98)` | 1 | 10675 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(23,61,111,0.12)` | 1 | 10676 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(39,113,88,0.18)` | 1 | 10680 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(181,117,36,0.22)` | 1 | 10684 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(29,79,145,0.14)` | 1 | 10701 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(244,248,252,0.98)` | 1 | 10774 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(247,250,253,0.96)` | 1 | 10844 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#245d49` | 1 | 10874 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(21,61,111,0.18)` | 1 | 10913 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(29,79,145,0.08)` | 1 | 10961 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(236,243,252,0.96)` | 1 | 11010 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f7f9fc` | 1 | 11016 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(29,79,145,0.22)` | 1 | 11031 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(252,243,240,0.92)` | 1 | 11037 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(17,31,49,0.1)` | 1 | 11063 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(232,240,250,0.98)` | 1 | 11338 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(29,79,145,0.92)` | 1 | 11635 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(70,130,201,0.88)` | 1 | 11635 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(241,246,252,0.9)` | 1 | 11647 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(39,113,88,0.14)` | 1 | 11676 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(246,250,248,0.96)` | 1 | 11677 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(27,43,65,0.06)` | 1 | 11701 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#edf1ec` | 1 | 11798 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f4f6f3` | 1 | 11802 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#d5ddd4` | 1 | 11803 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#b9c6bc` | 1 | 11804 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#111a16` | 1 | 11807 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#5f6d65` | 1 | 11808 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#839088` | 1 | 11809 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#254f48` | 1 | 11810 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#193a35` | 1 | 11811 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(37,79,72,0.1)` | 1 | 11812 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#b64236` | 1 | 11813 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(182,66,54,0.1)` | 1 | 11814 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#a96f16` | 1 | 11815 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(169,111,22,0.12)` | 1 | 11816 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(47,115,83,0.1)` | 1 | 11818 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(17,26,22,0.05)` | 1 | 11826 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(17,26,22,0.04)` | 1 | 11827 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(17,26,22,0.06)` | 1 | 11827 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(17,26,22,0.14)` | 1 | 11828 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#e6ece5` | 1 | 11831 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#fafafa` | 1 | 11867 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(17,26,22,0.045)` | 1 | 11868 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#26322d` | 1 | 11869 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(37,79,72,0.08)` | 1 | 11872 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(169,111,22,0.14)` | 1 | 11877 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(182,66,54,0.12)` | 1 | 11879 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(95,109,101,0.34)` | 1 | 11908 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(95,109,101,0.28)` | 1 | 11921 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(37,79,72,0.42)` | 1 | 11928 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(37,79,72,0.32)` | 1 | 12015 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(37,79,72,0.18)` | 1 | 12072 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(95,109,101,0.48)` | 1 | 12076 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(37,79,72,0.34)` | 1 | 12276 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(181,133,10,0.28)` | 1 | 12466 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(169,111,22,0.28)` | 1 | 12862 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(182,66,54,0.28)` | 1 | 12867 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(47,115,83,0.24)` | 1 | 12872 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f1f4f0` | 1 | 12885 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f7f9f6` | 1 | 12935 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(169,111,22,0.24)` | 1 | 12998 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#6f470d` | 1 | 13000 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(182,66,54,0.24)` | 1 | 13004 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#7c2c24` | 1 | 13006 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(47,115,83,0.22)` | 1 | 13010 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#20533b` | 1 | 13012 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(17,26,22,0.08)` | 1 | 13046 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(17,31,49,0.14)` | 1 | 13109 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#f6faf5` | 1 | 13122 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(47,115,83,0.5)` | 1 | 13201 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(169,111,22,0.58)` | 1 | 13209 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(182,66,54,0.58)` | 1 | 13217 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `rgba(59,99,123,0.48)` | 1 | 13225 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |
| `#3b637b` | 1 | 13229 | TOKEN MANCANTE -> valutare in Fase B | INVENTARIO |

## src/styles/editor-refactor.css

| Riga | Proprieta | Valore | Token | Stato |
|---:|---|---|---|---|
| 1 | `--editor-shell-bg` | `#e6e9e3` | - | RIMOSSO (blocco :root morto) |
| 2 | `--editor-shell-bg-muted` | `#dde2db` | - | RIMOSSO (blocco :root morto) |
| 3 | `--editor-panel` | `#f6f7f4` | - | RIMOSSO (blocco :root morto) |
| 4 | `--editor-panel-strong` | `#fbfcfa` | - | RIMOSSO (blocco :root morto) |
| 5 | `--editor-panel-muted` | `#eef1eb` | - | RIMOSSO (blocco :root morto) |
| 6 | `--editor-border` | `#c7cec5` | - | RIMOSSO (blocco :root morto) |
| 7 | `--editor-border-strong` | `#9ea89f` | - | RIMOSSO (blocco :root morto) |
| 8 | `--editor-text` | `#17201b` | - | RIMOSSO (blocco :root morto) |
| 9 | `--editor-text-strong` | `#0e1612` | - | RIMOSSO (blocco :root morto) |
| 10 | `--editor-text-muted` | `#5a665f` | - | RIMOSSO (blocco :root morto) |
| 11 | `--editor-text-faint` | `#77857d` | - | RIMOSSO (blocco :root morto) |
| 12 | `--editor-topbar` | `#171b1d` | - | RIMOSSO (blocco :root morto) |
| 13 | `--editor-topbar-text` | `#eef2ed` | - | RIMOSSO (blocco :root morto) |
| 14 | `--editor-topbar-muted` | `rgba(238, 242, 237, 0.68)` | - | RIMOSSO (blocco :root morto) |
| 15 | `--editor-topbar-line` | `rgba(255, 255, 255, 0.08)` | - | RIMOSSO (blocco :root morto) |
| 16 | `--editor-accent` | `#35564f` | - | RIMOSSO (blocco :root morto) |
| 17 | `--editor-accent-soft` | `rgba(53, 86, 79, 0.08)` | - | RIMOSSO (blocco :root morto) |
| 18 | `--editor-warning` | `#896326` | - | RIMOSSO (blocco :root morto) |
| 19 | `--editor-warning-soft` | `rgba(137, 99, 38, 0.1)` | - | RIMOSSO (blocco :root morto) |
| 20 | `--editor-error` | `#983f31` | - | RIMOSSO (blocco :root morto) |
| 21 | `--editor-error-soft` | `rgba(152, 63, 49, 0.1)` | - | RIMOSSO (blocco :root morto) |
| 22 | `--editor-success` | `#315846` | - | RIMOSSO (blocco :root morto) |
| 23 | `--editor-success-soft` | `rgba(49, 88, 70, 0.1)` | - | RIMOSSO (blocco :root morto) |
| 27 | `--editor-interactive-hover-bg` | `#eef2ec` | - | RIMOSSO (blocco :root morto) |
| 28 | `--editor-interactive-active-bg` | `#e6ece5` | - | RIMOSSO (blocco :root morto) |
| 29 | `--editor-interactive-hover-border` | `#a9b5ac` | - | RIMOSSO (blocco :root morto) |
| 30 | `--editor-interactive-active-border` | `#8b9a90` | - | RIMOSSO (blocco :root morto) |
| 31 | `--editor-interactive-focus-ring` | `rgba(53, 86, 79, 0.2)` | - | RIMOSSO (blocco :root morto) |
| 32 | `--editor-interactive-disabled-bg` | `#f2f4f1` | - | RIMOSSO (blocco :root morto) |
| 34 | `--diagram-node-fill` | `#ffffff` | - | RIMOSSO (blocco :root morto) |
| 35 | `--diagram-stroke` | `#2f3933` | - | RIMOSSO (blocco :root morto) |
| 36 | `--diagram-text` | `#101513` | - | RIMOSSO (blocco :root morto) |
| 37 | `--diagram-canvas-fill` | `#f8f9f6` | - | RIMOSSO (blocco :root morto) |
| 38 | `--diagram-grid` | `rgba(47, 57, 51, 0.04)` | - | RIMOSSO (blocco :root morto) |
| 39 | `--diagram-selection-stroke` | `#4c645b` | - | RIMOSSO (blocco :root morto) |
| 40 | `--diagram-selection-fill` | `rgba(76, 100, 91, 0.08)` | - | RIMOSSO (blocco :root morto) |
| 41 | `--diagram-focus` | `#4c645b` | - | RIMOSSO (blocco :root morto) |
| 42 | `--diagram-drag` | `#4c645b` | - | RIMOSSO (blocco :root morto) |
| 43 | `--diagram-drag-fill` | `rgba(76, 100, 91, 0.12)` | - | RIMOSSO (blocco :root morto) |
| 44 | `--diagram-pending` | `#896326` | - | RIMOSSO (blocco :root morto) |
| 45 | `--diagram-warning` | `#896326` | - | RIMOSSO (blocco :root morto) |
| 46 | `--diagram-warning-fill` | `rgba(137, 99, 38, 0.14)` | - | RIMOSSO (blocco :root morto) |
| 47 | `--diagram-error` | `#983f31` | - | RIMOSSO (blocco :root morto) |
| 48 | `--diagram-error-fill` | `rgba(152, 63, 49, 0.14)` | - | RIMOSSO (blocco :root morto) |
| 49 | `--logical-edge-stroke` | `#49534e` | - | RIMOSSO (blocco :root morto) |
| 80 | `background` | `#151414` | TOKEN MANCANTE | RESIDUO |
| 81 | `color` | `#ffffff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 98 | `color` | `rgba(255, 255, 255, 0.55)` | `color-mix(in srgb, var(--color-text-on-accent) 55%, transparent)` | SOSTITUITO |
| 107 | `border` | `#3c3c3c` | TOKEN MANCANTE | RESIDUO |
| 108 | `background` | `#1d1d1d` | TOKEN MANCANTE | RESIDUO |
| 109 | `color` | `#b9bdc3` | TOKEN MANCANTE | RESIDUO |
| 125 | `color` | `#ffffff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 138 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 139 | `color` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 151 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 161 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 167 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 172 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 176 | `--diagram-canvas-fill` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 177 | `--diagram-node-fill` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 191 | `border` | `#cfd4d1` | TOKEN MANCANTE | RESIDUO |
| 193 | `background` | `#f8f9f7` | TOKEN MANCANTE | RESIDUO |
| 194 | `box-shadow` | `rgba(17, 17, 17, 0.08)` | TOKEN MANCANTE | RESIDUO |
| 210 | `color` | `#000000` | TOKEN MANCANTE | RESIDUO |
| 224 | `border` | `#cfd4d1` | TOKEN MANCANTE | RESIDUO |
| 226 | `background` | `#f8f9f7` | TOKEN MANCANTE | RESIDUO |
| 227 | `box-shadow` | `rgba(17, 17, 17, 0.12)` | TOKEN MANCANTE | RESIDUO |
| 234 | `border-bottom` | `#e0e4e1` | TOKEN MANCANTE | RESIDUO |
| 236 | `color` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 249 | `background` | `rgba(47, 57, 51, 0.07)` | TOKEN MANCANTE | RESIDUO |
| 253 | `color` | `#9da29f` | TOKEN MANCANTE | RESIDUO |
| 258 | `color` | `#9da29f` | TOKEN MANCANTE | RESIDUO |
| 279 | `background` | `#d8ddda` | TOKEN MANCANTE | RESIDUO |
| 283 | `border-color` | `#ffd94d` | TOKEN MANCANTE | RESIDUO |
| 283 | `border-color` | `#cfd4d1` | TOKEN MANCANTE | RESIDUO |
| 284 | `background` | `#ffd94d` | TOKEN MANCANTE | RESIDUO |
| 309 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 381 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 382 | `--diagram-canvas-fill` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 383 | `--diagram-node-fill` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 384 | `--diagram-translation-pending` | `#ff3b30` | TOKEN MANCANTE | RESIDUO |
| 385 | `--diagram-translation-blocked` | `#ad7772` | TOKEN MANCANTE | RESIDUO |
| 390 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 399 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 418 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 423 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 439 | `color` | `#9ca39f` | TOKEN MANCANTE | RESIDUO |
| 460 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 468 | `color` | `#777f7a` | TOKEN MANCANTE | RESIDUO |
| 480 | `border` | `#cfd4d1` | TOKEN MANCANTE | RESIDUO |
| 482 | `background` | `#f8f9f7` | TOKEN MANCANTE | RESIDUO |
| 492 | `border-bottom` | `#e0e4e1` | TOKEN MANCANTE | RESIDUO |
| 494 | `color` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 504 | `color` | `#9da29f` | TOKEN MANCANTE | RESIDUO |
| 509 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 583 | `color` | `#1f6b4f` | TOKEN MANCANTE | RESIDUO |
| 588 | `color` | `#8a6426` | TOKEN MANCANTE | RESIDUO |
| 592 | `color` | `#777f7a` | TOKEN MANCANTE | RESIDUO |
| 604 | `color` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 632 | `border` | `rgba(47, 57, 51, 0.1)` | TOKEN MANCANTE | RESIDUO |
| 634 | `background` | `rgba(248, 249, 247, 0.92)` | TOKEN MANCANTE | RESIDUO |
| 635 | `box-shadow` | `rgba(17, 17, 17, 0.05)` | TOKEN MANCANTE | RESIDUO |
| 635 | `box-shadow` | `rgba(17, 17, 17, 0.06)` | TOKEN MANCANTE | RESIDUO |
| 652 | `border-right` | `rgba(47, 57, 51, 0.08)` | TOKEN MANCANTE | RESIDUO |
| 654 | `color` | `#17201b` | TOKEN MANCANTE | RESIDUO |
| 666 | `background` | `rgba(47, 57, 51, 0.06)` | TOKEN MANCANTE | RESIDUO |
| 696 | `background` | `rgba(47, 57, 51, 0.08)` | TOKEN MANCANTE | RESIDUO |
| 700 | `color` | `#717b75` | TOKEN MANCANTE | RESIDUO |
| 715 | `border-right` | `#c4cac4` | TOKEN MANCANTE | RESIDUO |
| 716 | `background` | `#eef2ed` | TOKEN MANCANTE | RESIDUO |
| 723 | `color` | `#a2a9a5` | TOKEN MANCANTE | RESIDUO |
| 753 | `border-right` | `#d3d9d1` | TOKEN MANCANTE | RESIDUO |
| 754 | `background` | `rgba(238, 242, 237, 0.86)` | TOKEN MANCANTE | RESIDUO |
| 755 | `color` | `#7b8580` | TOKEN MANCANTE | RESIDUO |
| 794 | `color` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 803 | `caret-color` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 812 | `color` | `#7b8580` | TOKEN MANCANTE | RESIDUO |
| 821 | `background` | `rgba(60, 110, 150, 0.25)` | TOKEN MANCANTE | RESIDUO |
| 825 | `color` | `#7b8ea0` | TOKEN MANCANTE | RESIDUO |
| 826 | `color` | `#0075a8` | TOKEN MANCANTE | RESIDUO |
| 827 | `color` | `#005d80` | TOKEN MANCANTE | RESIDUO |
| 828 | `color` | `#b00074` | TOKEN MANCANTE | RESIDUO |
| 829 | `color` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 830 | `color` | `#8e0074` | TOKEN MANCANTE | RESIDUO |
| 833 | `color` | `#9b2d24` | TOKEN MANCANTE | RESIDUO |
| 844 | `background` | `rgba(0, 0, 0, 0.32)` | TOKEN MANCANTE | RESIDUO |
| 852 | `border` | `#cfd4d1` | TOKEN MANCANTE | RESIDUO |
| 854 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 855 | `box-shadow` | `rgba(0, 0, 0, 0.22)` | TOKEN MANCANTE | RESIDUO |
| 865 | `border-bottom` | `#e0e4e1` | TOKEN MANCANTE | RESIDUO |
| 877 | `color` | `#5e6661` | TOKEN MANCANTE | RESIDUO |
| 886 | `border` | `#cfd4d1` | TOKEN MANCANTE | RESIDUO |
| 888 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 889 | `color` | `#1d2220` | TOKEN MANCANTE | RESIDUO |
| 898 | `border-bottom` | `#e0e4e1` | TOKEN MANCANTE | RESIDUO |
| 899 | `background` | `rgba(47, 57, 51, 0.04)` | TOKEN MANCANTE | RESIDUO |
| 904 | `border` | `#cfd4d1` | TOKEN MANCANTE | RESIDUO |
| 906 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 907 | `color` | `#1d2220` | TOKEN MANCANTE | RESIDUO |
| 915 | `color` | `#9da29f` | TOKEN MANCANTE | RESIDUO |
| 923 | `background` | `rgba(47, 57, 51, 0.07)` | TOKEN MANCANTE | RESIDUO |
| 932 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 933 | `color` | `#1d2220` | TOKEN MANCANTE | RESIDUO |
| 939 | `color` | `#8a918d` | TOKEN MANCANTE | RESIDUO |
| 947 | `border-top` | `#e0e4e1` | TOKEN MANCANTE | RESIDUO |
| 948 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 955 | `border` | `#cfd4d1` | TOKEN MANCANTE | RESIDUO |
| 966 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 967 | `color` | `#1d2220` | TOKEN MANCANTE | RESIDUO |
| 971 | `border-color` | `#35564f` | TOKEN MANCANTE | RESIDUO |
| 972 | `background` | `#35564f` | TOKEN MANCANTE | RESIDUO |
| 973 | `color` | `#ffffff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 978 | `background` | `rgba(47, 57, 51, 0.07)` | TOKEN MANCANTE | RESIDUO |
| 983 | `background` | `#263f39` | TOKEN MANCANTE | RESIDUO |
| 984 | `border-color` | `#263f39` | TOKEN MANCANTE | RESIDUO |
| 989 | `outline` | `rgba(53, 86, 79, 0.35)` | TOKEN MANCANTE | RESIDUO |
| 994 | `border-color` | `#cfd4d1` | TOKEN MANCANTE | RESIDUO |
| 995 | `background` | `#e5e9e6` | TOKEN MANCANTE | RESIDUO |
| 996 | `color` | `#8d948f` | TOKEN MANCANTE | RESIDUO |
| 1011 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 1040 | `outline` | `rgba(53, 86, 79, 0.26)` | TOKEN MANCANTE | RESIDUO |
| 1082 | `border` | `rgba(255, 255, 255, 0.12)` | `color-mix(in srgb, var(--color-bg-elevated) 12%, transparent)` | SOSTITUITO |
| 1083 | `background` | `rgba(255, 255, 255, 0.03)` | `color-mix(in srgb, var(--color-bg-elevated) 3%, transparent)` | SOSTITUITO |
| 1184 | `border-color` | `rgba(255, 255, 255, 0.12)` | `color-mix(in srgb, var(--color-bg-elevated) 12%, transparent)` | SOSTITUITO |
| 1191 | `background` | `rgba(255, 255, 255, 0.05)` | `color-mix(in srgb, var(--color-bg-elevated) 5%, transparent)` | SOSTITUITO |
| 1195 | `border-color` | `rgba(255, 255, 255, 0.22)` | `color-mix(in srgb, var(--color-bg-elevated) 22%, transparent)` | SOSTITUITO |
| 1196 | `background` | `rgba(255, 255, 255, 0.1)` | `color-mix(in srgb, var(--color-bg-elevated) 10%, transparent)` | SOSTITUITO |
| 1308 | `border-color` | `rgba(137, 99, 38, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 1314 | `border-color` | `rgba(49, 88, 70, 0.24)` | TOKEN MANCANTE | RESIDUO |
| 1459 | `background` | `#f2f4ef` | TOKEN MANCANTE | RESIDUO |
| 1553 | `background` | `rgba(251, 252, 250, 0.92)` | TOKEN MANCANTE | RESIDUO |
| 1597 | `background` | `rgba(251, 252, 250, 0.96)` | TOKEN MANCANTE | RESIDUO |
| 1923 | `box-shadow` | `rgba(79, 107, 100, 0.14)` | TOKEN MANCANTE | RESIDUO |
| 1984 | `border-color` | `rgba(152, 63, 49, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 2038 | `background` | `#fcfdfb` | TOKEN MANCANTE | RESIDUO |
| 2129 | `background` | `#f8f9f6` | TOKEN MANCANTE | RESIDUO |
| 2187 | `border-color` | `rgba(137, 99, 38, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 2192 | `border-color` | `rgba(152, 63, 49, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 2262 | `background` | `#eef2ec` | TOKEN MANCANTE | RESIDUO |
| 2287 | `background` | `#fbfcfa` | TOKEN MANCANTE | RESIDUO |
| 2448 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 2471 | `background` | `rgba(22, 28, 25, 0.32)` | TOKEN MANCANTE | RESIDUO |
| 2477 | `background` | `rgba(20, 24, 22, 0.44)` | TOKEN MANCANTE | RESIDUO |
| 2619 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 2663 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 2694 | `background` | `#f0f2ee` | TOKEN MANCANTE | RESIDUO |
| 2744 | `border-color` | `rgba(137, 99, 38, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 2749 | `border-color` | `rgba(152, 63, 49, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 2779 | `border-color` | `rgba(137, 99, 38, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 2784 | `border-color` | `rgba(152, 63, 49, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 2789 | `border-color` | `rgba(49, 88, 70, 0.24)` | TOKEN MANCANTE | RESIDUO |
| 2858 | `background` | `#f4f6f2` | TOKEN MANCANTE | RESIDUO |
| 3089 | `background` | `#eef2ec` | TOKEN MANCANTE | RESIDUO |
| 3095 | `background` | `rgba(251, 252, 250, 0.82)` | TOKEN MANCANTE | RESIDUO |
| 3100 | `background` | `#fbfcfa` | TOKEN MANCANTE | RESIDUO |
| 3105 | `background` | `#fbfcfa` | TOKEN MANCANTE | RESIDUO |
| 3106 | `box-shadow` | `rgba(53, 86, 79, 0.16)` | TOKEN MANCANTE | RESIDUO |
| 3117 | `background` | `rgba(251, 252, 250, 0.78)` | TOKEN MANCANTE | RESIDUO |
| 3123 | `background` | `#fbfcfa` | TOKEN MANCANTE | RESIDUO |
| 3191 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 3244 | `background` | `#17201b` | TOKEN MANCANTE | RESIDUO |
| 3245 | `color` | `#ffffff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 3251 | `border-color` | `rgba(255, 255, 255, 0.24)` | `color-mix(in srgb, var(--color-bg-elevated) 24%, transparent)` | SOSTITUITO |
| 3252 | `background` | `rgba(255, 255, 255, 0.1)` | `color-mix(in srgb, var(--color-bg-elevated) 10%, transparent)` | SOSTITUITO |
| 3253 | `color` | `rgba(255, 255, 255, 0.78)` | `color-mix(in srgb, var(--color-text-on-accent) 78%, transparent)` | SOSTITUITO |
| 3264 | `border` | `rgba(137, 99, 38, 0.22)` | TOKEN MANCANTE | RESIDUO |
| 3266 | `background` | `#fffaf0` | TOKEN MANCANTE | RESIDUO |
| 3270 | `background` | `rgba(255, 255, 255, 0.78)` | `color-mix(in srgb, var(--color-bg-elevated) 78%, transparent)` | SOSTITUITO |
| 3294 | `background` | `#fbfcfa` | TOKEN MANCANTE | RESIDUO |
| 3298 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 3346 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 3351 | `background` | `#fbfcfa` | TOKEN MANCANTE | RESIDUO |
| 3370 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 3387 | `background` | `#fbfcfa` | TOKEN MANCANTE | RESIDUO |
| 3415 | `background` | `#fffaf0` | TOKEN MANCANTE | RESIDUO |
| 3426 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 3431 | `background` | `#f6f8f4` | TOKEN MANCANTE | RESIDUO |
| 3460 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 3465 | `background` | `#fbfcfa` | TOKEN MANCANTE | RESIDUO |
| 3490 | `background` | `#f6f8f4` | TOKEN MANCANTE | RESIDUO |
| 3506 | `background` | `rgba(255, 255, 255, 0.68)` | `color-mix(in srgb, var(--color-bg-elevated) 68%, transparent)` | SOSTITUITO |
| 3641 | `color` | `#ffffff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 3651 | `color` | `#ffffff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 3655 | `border-color` | `rgba(159, 62, 52, 0.26)` | TOKEN MANCANTE | RESIDUO |
| 3780 | `border-bottom` | `rgba(255, 255, 255, 0.09)` | `color-mix(in srgb, var(--color-bg-elevated) 9%, transparent)` | SOSTITUITO |
| 3782 | `background` | `#111816` | TOKEN MANCANTE | RESIDUO |
| 3783 | `color` | `#eef5f0` | TOKEN MANCANTE | RESIDUO |
| 3796 | `border` | `rgba(255, 255, 255, 0.2)` | `color-mix(in srgb, var(--color-bg-elevated) 20%, transparent)` | SOSTITUITO |
| 3798 | `background` | `rgba(255, 255, 255, 0.08)` | `color-mix(in srgb, var(--color-bg-elevated) 8%, transparent)` | SOSTITUITO |
| 3799 | `color` | `#ffffff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 3804 | `color` | `#ffffff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 3810 | `color` | `rgba(238, 245, 240, 0.68)` | TOKEN MANCANTE | RESIDUO |
| 3816 | `border` | `rgba(255, 255, 255, 0.14)` | `color-mix(in srgb, var(--color-bg-elevated) 14%, transparent)` | SOSTITUITO |
| 3818 | `background` | `rgba(255, 255, 255, 0.06)` | `color-mix(in srgb, var(--color-bg-elevated) 6%, transparent)` | SOSTITUITO |
| 3819 | `color` | `#eef5f0` | TOKEN MANCANTE | RESIDUO |
| 3826 | `border-color` | `rgba(255, 255, 255, 0.28)` | `color-mix(in srgb, var(--color-bg-elevated) 28%, transparent)` | SOSTITUITO |
| 3827 | `background` | `rgba(255, 255, 255, 0.12)` | `color-mix(in srgb, var(--color-bg-elevated) 12%, transparent)` | SOSTITUITO |
| 3828 | `color` | `#ffffff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 3833 | `border-color` | `rgba(117, 190, 157, 0.5)` | TOKEN MANCANTE | RESIDUO |
| 3834 | `background` | `rgba(117, 190, 157, 0.18)` | TOKEN MANCANTE | RESIDUO |
| 3835 | `color` | `#ffffff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 3843 | `border` | `rgba(255, 255, 255, 0.11)` | `color-mix(in srgb, var(--color-bg-elevated) 11%, transparent)` | SOSTITUITO |
| 3845 | `background` | `rgba(255, 255, 255, 0.04)` | `color-mix(in srgb, var(--color-bg-elevated) 4%, transparent)` | SOSTITUITO |
| 3886 | `box-shadow` | `rgba(37, 79, 72, 0.14)` | TOKEN MANCANTE | RESIDUO |
| 3890 | `border-color` | `rgba(138, 100, 38, 0.24)` | TOKEN MANCANTE | RESIDUO |
| 3894 | `border-color` | `rgba(47, 104, 79, 0.22)` | TOKEN MANCANTE | RESIDUO |
| 3911 | `border-color` | `rgba(138, 100, 38, 0.3)` | TOKEN MANCANTE | RESIDUO |
| 3916 | `border-color` | `rgba(47, 104, 79, 0.24)` | TOKEN MANCANTE | RESIDUO |
| 4048 | `border-color` | `rgba(138, 100, 38, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 4060 | `border-color` | `rgba(159, 62, 52, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 4159 | `border-color` | `rgba(159, 62, 52, 0.24)` | TOKEN MANCANTE | RESIDUO |
| 4202 | `filter` | `rgba(183, 126, 0, 0.58)` | TOKEN MANCANTE | RESIDUO |
| 4234 | `background` | `rgba(255, 255, 255, 0.94)` | `color-mix(in srgb, var(--color-bg-elevated) 94%, transparent)` | SOSTITUITO |
| 4310 | `box-shadow` | `rgba(17, 26, 22, 0.06)` | TOKEN MANCANTE | RESIDUO |
| 4349 | `border-color` | `rgba(159, 62, 52, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 4353 | `border-color` | `rgba(138, 100, 38, 0.26)` | TOKEN MANCANTE | RESIDUO |
| 4384 | `background` | `#fbfcfa` | TOKEN MANCANTE | RESIDUO |
| 4427 | `border-color` | `rgba(138, 100, 38, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 4538 | `border-color` | `rgba(138, 100, 38, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 4540 | `color` | `#5f461e` | TOKEN MANCANTE | RESIDUO |
| 4546 | `border-color` | `rgba(159, 62, 52, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 4680 | `background` | `rgba(248, 250, 247, 0.92)` | TOKEN MANCANTE | RESIDUO |
| 4737 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4747 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4766 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4772 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4785 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4786 | `--diagram-canvas-fill` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4787 | `--diagram-node-fill` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4788 | `--diagram-stroke` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 4789 | `--diagram-text` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 4790 | `--diagram-selection-stroke` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 4791 | `--diagram-selection-fill` | `rgba(17, 17, 17, 0.08)` | TOKEN MANCANTE | RESIDUO |
| 4792 | `--diagram-focus` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 4793 | `--diagram-drag` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 4794 | `--diagram-pending` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 4805 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4819 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4820 | `--diagram-canvas-fill` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4821 | `--diagram-node-fill` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4830 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4841 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4848 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4866 | `color` | `#a6ada8` | TOKEN MANCANTE | RESIDUO |
| 4880 | `color` | `#8c928d` | TOKEN MANCANTE | RESIDUO |
| 4991 | `color` | `#0a5e74` | TOKEN MANCANTE | RESIDUO |
| 4993 | `text-decoration-color` | `#0a5e74` | TOKEN MANCANTE | RESIDUO |
| 5000 | `color` | `#7a3f00` | TOKEN MANCANTE | RESIDUO |
| 5008 | `color` | `#0076a8` | TOKEN MANCANTE | RESIDUO |
| 5017 | `color` | `#0076a8` | TOKEN MANCANTE | RESIDUO |
| 5021 | `color` | `#0a85bd` | TOKEN MANCANTE | RESIDUO |
| 5025 | `color` | `#b01876` | TOKEN MANCANTE | RESIDUO |
| 5039 | `color` | `#71849a` | TOKEN MANCANTE | RESIDUO |
| 5063 | `background` | `#fff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 5064 | `border` | `#cfd4d1` | TOKEN MANCANTE | RESIDUO |
| 5066 | `box-shadow` | `rgba(21, 28, 24, 0.08)` | TOKEN MANCANTE | RESIDUO |
| 5076 | `border-bottom` | `#eee` | TOKEN MANCANTE | RESIDUO |
| 5077 | `background` | `#fff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 5078 | `color` | `#222` | TOKEN MANCANTE | RESIDUO |
| 5085 | `background` | `#eef2ed` | TOKEN MANCANTE | RESIDUO |
| 5114 | `fill` | `#101513` | TOKEN MANCANTE | RESIDUO |
| 5120 | `fill` | `#101513` | TOKEN MANCANTE | RESIDUO |
| 5141 | `fill` | `rgba(9, 86, 72, 0.95)` | TOKEN MANCANTE | RESIDUO |
| 5145 | `fill` | `rgba(9, 86, 72, 0.16)` | TOKEN MANCANTE | RESIDUO |
| 5146 | `stroke` | `rgba(9, 86, 72, 0.45)` | TOKEN MANCANTE | RESIDUO |
| 5150 | `fill` | `rgba(35, 71, 116, 0.9)` | TOKEN MANCANTE | RESIDUO |
| 5154 | `fill` | `rgba(35, 71, 116, 0.16)` | TOKEN MANCANTE | RESIDUO |
| 5155 | `stroke` | `rgba(35, 71, 116, 0.4)` | TOKEN MANCANTE | RESIDUO |
| 5159 | `fill` | `rgba(140, 84, 24, 0.92)` | TOKEN MANCANTE | RESIDUO |
| 5163 | `fill` | `rgba(140, 84, 24, 0.16)` | TOKEN MANCANTE | RESIDUO |
| 5164 | `stroke` | `rgba(140, 84, 24, 0.42)` | TOKEN MANCANTE | RESIDUO |
| 5168 | `fill` | `rgba(94, 42, 28, 0.9)` | TOKEN MANCANTE | RESIDUO |
| 5172 | `fill` | `rgba(94, 42, 28, 0.16)` | TOKEN MANCANTE | RESIDUO |
| 5173 | `stroke` | `rgba(94, 42, 28, 0.4)` | TOKEN MANCANTE | RESIDUO |
| 5209 | `background` | `rgba(16, 21, 18, 0.42)` | TOKEN MANCANTE | RESIDUO |
| 5219 | `border` | `rgba(34, 44, 40, 0.18)` | TOKEN MANCANTE | RESIDUO |
| 5221 | `background` | `#fbfcfa` | TOKEN MANCANTE | RESIDUO |
| 5222 | `color` | `#101513` | TOKEN MANCANTE | RESIDUO |
| 5223 | `box-shadow` | `rgba(17, 24, 20, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 5232 | `background` | `#fbfcfa` | TOKEN MANCANTE | RESIDUO |
| 5241 | `border-bottom` | `rgba(34, 44, 40, 0.14)` | TOKEN MANCANTE | RESIDUO |
| 5254 | `color` | `rgba(39, 48, 43, 0.72)` | TOKEN MANCANTE | RESIDUO |
| 5263 | `color` | `rgba(31, 75, 65, 0.92)` | TOKEN MANCANTE | RESIDUO |
| 5274 | `border` | `rgba(34, 44, 40, 0.16)` | TOKEN MANCANTE | RESIDUO |
| 5276 | `background` | `rgba(255, 255, 255, 0.78)` | `color-mix(in srgb, var(--color-bg-elevated) 78%, transparent)` | SOSTITUITO |
| 5277 | `color` | `rgba(26, 34, 30, 0.82)` | TOKEN MANCANTE | RESIDUO |
| 5299 | `border` | `rgba(54, 72, 64, 0.16)` | TOKEN MANCANTE | RESIDUO |
| 5302 | `background` | `rgba(248, 249, 246, 0.78)` | TOKEN MANCANTE | RESIDUO |
| 5303 | `color` | `rgba(44, 52, 48, 0.72)` | TOKEN MANCANTE | RESIDUO |
| 5308 | `border-color` | `rgba(34, 109, 87, 0.25)` | TOKEN MANCANTE | RESIDUO |
| 5309 | `background` | `rgba(34, 109, 87, 0.1)` | TOKEN MANCANTE | RESIDUO |
| 5310 | `color` | `rgba(19, 82, 64, 0.94)` | TOKEN MANCANTE | RESIDUO |
| 5316 | `border` | `rgba(39, 54, 49, 0.14)` | TOKEN MANCANTE | RESIDUO |
| 5319 | `background` | `rgba(255, 255, 255, 0.62)` | `color-mix(in srgb, var(--color-bg-elevated) 62%, transparent)` | SOSTITUITO |
| 5338 | `color` | `rgba(39, 48, 43, 0.68)` | TOKEN MANCANTE | RESIDUO |
| 5344 | `border` | `rgba(153, 94, 38, 0.22)` | TOKEN MANCANTE | RESIDUO |
| 5347 | `background` | `rgba(153, 94, 38, 0.08)` | TOKEN MANCANTE | RESIDUO |
| 5348 | `color` | `rgba(112, 67, 24, 0.94)` | TOKEN MANCANTE | RESIDUO |
| 5354 | `border-color` | `rgba(34, 109, 87, 0.24)` | TOKEN MANCANTE | RESIDUO |
| 5355 | `background` | `rgba(34, 109, 87, 0.1)` | TOKEN MANCANTE | RESIDUO |
| 5356 | `color` | `rgba(19, 82, 64, 0.94)` | TOKEN MANCANTE | RESIDUO |
| 5369 | `border` | `rgba(43, 58, 52, 0.16)` | TOKEN MANCANTE | RESIDUO |
| 5372 | `background` | `rgba(252, 253, 251, 0.86)` | TOKEN MANCANTE | RESIDUO |
| 5378 | `border-color` | `rgba(31, 86, 73, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 5379 | `background` | `rgba(248, 252, 249, 0.98)` | TOKEN MANCANTE | RESIDUO |
| 5383 | `border-color` | `rgba(24, 105, 86, 0.58)` | TOKEN MANCANTE | RESIDUO |
| 5384 | `background` | `rgba(34, 109, 87, 0.09)` | TOKEN MANCANTE | RESIDUO |
| 5385 | `box-shadow` | `rgba(24, 105, 86, 0.38)` | TOKEN MANCANTE | RESIDUO |
| 5407 | `color` | `rgba(39, 48, 43, 0.7)` | TOKEN MANCANTE | RESIDUO |
| 5416 | `border-left` | `rgba(42, 66, 58, 0.2)` | TOKEN MANCANTE | RESIDUO |
| 5418 | `color` | `rgba(42, 50, 46, 0.68)` | TOKEN MANCANTE | RESIDUO |
| 5424 | `color` | `rgba(42, 50, 46, 0.54)` | TOKEN MANCANTE | RESIDUO |
| 5435 | `border-top` | `rgba(34, 44, 40, 0.14)` | TOKEN MANCANTE | RESIDUO |
| 5439 | `color` | `rgba(39, 48, 43, 0.72)` | TOKEN MANCANTE | RESIDUO |
| 5450 | `border` | `rgba(34, 44, 40, 0.18)` | TOKEN MANCANTE | RESIDUO |
| 5453 | `background` | `rgba(255, 255, 255, 0.9)` | `color-mix(in srgb, var(--color-bg-elevated) 90%, transparent)` | SOSTITUITO |
| 5454 | `color` | `rgba(26, 34, 30, 0.88)` | TOKEN MANCANTE | RESIDUO |
| 5460 | `border-color` | `rgba(24, 105, 86, 0.5)` | TOKEN MANCANTE | RESIDUO |
| 5461 | `background` | `rgba(24, 105, 86, 0.94)` | TOKEN MANCANTE | RESIDUO |
| 5462 | `color` | `#fff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 5466 | `border-color` | `rgba(34, 44, 40, 0.12)` | TOKEN MANCANTE | RESIDUO |
| 5467 | `background` | `rgba(34, 44, 40, 0.08)` | TOKEN MANCANTE | RESIDUO |
| 5468 | `color` | `rgba(39, 48, 43, 0.42)` | TOKEN MANCANTE | RESIDUO |
| 5492 | `border-right` | `rgba(34, 44, 40, 0.14)` | TOKEN MANCANTE | RESIDUO |
| 5501 | `color` | `rgba(31, 75, 65, 0.82)` | TOKEN MANCANTE | RESIDUO |
| 5514 | `color` | `rgba(39, 48, 43, 0.68)` | TOKEN MANCANTE | RESIDUO |
| 5523 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 5530 | `border-bottom` | `rgba(34, 44, 40, 0.14)` | TOKEN MANCANTE | RESIDUO |
| 5531 | `background` | `rgba(251, 252, 250, 0.82)` | TOKEN MANCANTE | RESIDUO |
| 5536 | `color` | `rgba(39, 48, 43, 0.68)` | TOKEN MANCANTE | RESIDUO |
| 5562 | `border` | `rgba(35, 47, 42, 0.16)` | TOKEN MANCANTE | RESIDUO |
| 5564 | `background` | `rgba(237, 241, 235, 0.7)` | TOKEN MANCANTE | RESIDUO |
| 5575 | `fill` | `rgba(223, 227, 220, 0.82)` | `color-mix(in srgb, var(--color-bg-diagram-canvas) 82%, transparent)` | SOSTITUITO |
| 5579 | `stroke` | `rgba(34, 45, 40, 0.8)` | TOKEN MANCANTE | RESIDUO |
| 5590 | `fill` | `rgba(246, 249, 245, 0.92)` | TOKEN MANCANTE | RESIDUO |
| 5591 | `stroke` | `rgba(31, 43, 38, 0.92)` | TOKEN MANCANTE | RESIDUO |
| 5596 | `fill` | `rgba(232, 242, 237, 0.96)` | TOKEN MANCANTE | RESIDUO |
| 5600 | `fill` | `rgba(245, 247, 242, 0.9)` | TOKEN MANCANTE | RESIDUO |
| 5604 | `fill` | `rgba(246, 249, 245, 0.96)` | TOKEN MANCANTE | RESIDUO |
| 5605 | `stroke` | `rgba(31, 43, 38, 0.92)` | TOKEN MANCANTE | RESIDUO |
| 5610 | `fill` | `rgba(29, 103, 84, 0.9)` | TOKEN MANCANTE | RESIDUO |
| 5614 | `fill` | `rgba(35, 71, 116, 0.86)` | TOKEN MANCANTE | RESIDUO |
| 5620 | `fill` | `#101513` | TOKEN MANCANTE | RESIDUO |
| 5626 | `fill` | `#fff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 5632 | `fill` | `rgba(42, 50, 46, 0.62)` | TOKEN MANCANTE | RESIDUO |
| 5637 | `fill` | `rgba(246, 249, 245, 0.94)` | TOKEN MANCANTE | RESIDUO |
| 5638 | `stroke` | `rgba(31, 43, 38, 0.9)` | TOKEN MANCANTE | RESIDUO |
| 5643 | `fill` | `rgba(226, 234, 228, 0.95)` | TOKEN MANCANTE | RESIDUO |
| 5647 | `fill` | `rgba(219, 239, 231, 0.98)` | TOKEN MANCANTE | RESIDUO |
| 5651 | `stroke` | `rgba(31, 43, 38, 0.72)` | TOKEN MANCANTE | RESIDUO |
| 5656 | `fill` | `#101513` | TOKEN MANCANTE | RESIDUO |
| 5662 | `fill` | `rgba(250, 252, 249, 0.76)` | TOKEN MANCANTE | RESIDUO |
| 5663 | `stroke` | `rgba(31, 43, 38, 0.16)` | TOKEN MANCANTE | RESIDUO |
| 5668 | `fill` | `rgba(34, 109, 87, 0.12)` | TOKEN MANCANTE | RESIDUO |
| 5672 | `fill` | `#101513` | TOKEN MANCANTE | RESIDUO |
| 5678 | `fill` | `rgba(31, 92, 77, 0.16)` | TOKEN MANCANTE | RESIDUO |
| 5679 | `stroke` | `rgba(31, 92, 77, 0.34)` | TOKEN MANCANTE | RESIDUO |
| 5684 | `fill` | `rgba(18, 80, 62, 0.94)` | TOKEN MANCANTE | RESIDUO |
| 5691 | `stroke` | `rgba(31, 43, 38, 0.86)` | TOKEN MANCANTE | RESIDUO |
| 5697 | `fill` | `rgba(31, 43, 38, 0.86)` | TOKEN MANCANTE | RESIDUO |
| 5701 | `fill` | `rgba(35, 71, 116, 0.9)` | TOKEN MANCANTE | RESIDUO |
| 5707 | `border` | `rgba(35, 47, 42, 0.16)` | TOKEN MANCANTE | RESIDUO |
| 5710 | `background` | `rgba(251, 252, 250, 0.94)` | TOKEN MANCANTE | RESIDUO |
| 5719 | `border-bottom` | `rgba(35, 47, 42, 0.12)` | TOKEN MANCANTE | RESIDUO |
| 5723 | `color` | `rgba(39, 48, 43, 0.68)` | TOKEN MANCANTE | RESIDUO |
| 5737 | `border-top` | `rgba(35, 47, 42, 0.08)` | TOKEN MANCANTE | RESIDUO |
| 5746 | `background` | `rgba(34, 109, 87, 0.08)` | TOKEN MANCANTE | RESIDUO |
| 5757 | `background` | `rgba(31, 92, 77, 0.14)` | TOKEN MANCANTE | RESIDUO |
| 5758 | `color` | `rgba(18, 80, 62, 0.94)` | TOKEN MANCANTE | RESIDUO |
| 5766 | `color` | `rgba(39, 48, 43, 0.68)` | TOKEN MANCANTE | RESIDUO |
| 5776 | `color` | `rgba(24, 35, 30, 0.92)` | TOKEN MANCANTE | RESIDUO |
| 5781 | `border-color` | `rgba(24, 105, 86, 0.42)` | TOKEN MANCANTE | RESIDUO |
| 5782 | `background` | `rgba(34, 109, 87, 0.12)` | TOKEN MANCANTE | RESIDUO |
| 5792 | `border` | `rgba(31, 92, 77, 0.2)` | TOKEN MANCANTE | RESIDUO |
| 5795 | `background` | `rgba(31, 92, 77, 0.08)` | TOKEN MANCANTE | RESIDUO |
| 5796 | `color` | `rgba(22, 82, 65, 0.95)` | TOKEN MANCANTE | RESIDUO |
| 5818 | `border` | `rgba(35, 47, 42, 0.14)` | TOKEN MANCANTE | RESIDUO |
| 5820 | `background` | `rgba(251, 252, 250, 0.86)` | TOKEN MANCANTE | RESIDUO |
| 5839 | `color` | `rgba(39, 48, 43, 0.68)` | TOKEN MANCANTE | RESIDUO |
| 5848 | `color` | `#101513` | TOKEN MANCANTE | RESIDUO |
| 5863 | `color` | `rgba(39, 48, 43, 0.78)` | TOKEN MANCANTE | RESIDUO |
| 5869 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 5904 | `fill` | `rgba(35, 71, 116, 0.9)` | TOKEN MANCANTE | RESIDUO |
| 5923 | `border-bottom` | `rgba(34, 44, 40, 0.14)` | TOKEN MANCANTE | RESIDUO |
| 5955 | `fill` | `rgba(17, 23, 19, 0.08)` | TOKEN MANCANTE | RESIDUO |
| 5959 | `fill` | `#101513` | TOKEN MANCANTE | RESIDUO |
| 5986 | `fill` | `#fbfcfa` | TOKEN MANCANTE | RESIDUO |
| 5987 | `stroke` | `#707a73` | TOKEN MANCANTE | RESIDUO |
| 5992 | `fill` | `#35564f` | TOKEN MANCANTE | RESIDUO |
| 5996 | `fill` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 6004 | `fill` | `#0e1612` | TOKEN MANCANTE | RESIDUO |
| 6011 | `fill` | `#eef5f0` | TOKEN MANCANTE | RESIDUO |
| 6012 | `stroke` | `#243d34` | TOKEN MANCANTE | RESIDUO |
| 6018 | `fill` | `#f3f8f5` | TOKEN MANCANTE | RESIDUO |
| 6019 | `stroke` | `#243d34` | TOKEN MANCANTE | RESIDUO |
| 6029 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 6047 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 6077 | `background` | `rgba(13, 16, 14, 0.48)` | TOKEN MANCANTE | RESIDUO |
| 6091 | `box-shadow` | `rgba(12, 18, 15, 0.16)` | TOKEN MANCANTE | RESIDUO |
| 6173 | `background` | `rgba(13, 16, 14, 0.46)` | TOKEN MANCANTE | RESIDUO |
| 6187 | `box-shadow` | `rgba(12, 18, 15, 0.22)` | TOKEN MANCANTE | RESIDUO |
| 6411 | `color` | `#ffffff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 6697 | `background` | `rgba(13, 18, 15, 0.58)` | TOKEN MANCANTE | RESIDUO |
| 6697 | `background` | `rgba(29, 35, 31, 0.46)` | TOKEN MANCANTE | RESIDUO |
| 6697 | `background` | `rgba(13, 16, 14, 0.42)` | TOKEN MANCANTE | RESIDUO |
| 6710 | `border` | `rgba(255, 255, 255, 0.2)` | `color-mix(in srgb, var(--color-bg-elevated) 20%, transparent)` | SOSTITUITO |
| 6714 | `box-shadow` | `rgba(8, 14, 11, 0.32)` | TOKEN MANCANTE | RESIDUO |
| 6723 | `background` | `rgba(255, 255, 255, 0.96)` | `color-mix(in srgb, var(--color-bg-elevated) 96%, transparent)` | SOSTITUITO |
| 6723 | `background` | `rgba(244, 247, 243, 0.96)` | TOKEN MANCANTE | RESIDUO |
| 6734 | `background` | `rgba(251, 252, 250, 0.98)` | TOKEN MANCANTE | RESIDUO |
| 6734 | `background` | `rgba(241, 246, 242, 0.98)` | TOKEN MANCANTE | RESIDUO |
| 6734 | `background` | `rgba(252, 247, 239, 0.98)` | TOKEN MANCANTE | RESIDUO |
| 6748 | `background` | `rgba(44, 105, 85, 0.22)` | TOKEN MANCANTE | RESIDUO |
| 6748 | `background` | `rgba(181, 132, 74, 0.2)` | TOKEN MANCANTE | RESIDUO |
| 6755 | `background` | `rgba(39, 58, 50, 0.06)` | TOKEN MANCANTE | RESIDUO |
| 6755 | `background` | `rgba(39, 58, 50, 0.06)` | TOKEN MANCANTE | RESIDUO |
| 6759 | `mask-image` | `rgba(0, 0, 0, 0.72)` | TOKEN MANCANTE | RESIDUO |
| 6784 | `border` | `rgba(34, 99, 78, 0.22)` | TOKEN MANCANTE | RESIDUO |
| 6786 | `background` | `rgba(34, 99, 78, 0.1)` | TOKEN MANCANTE | RESIDUO |
| 6787 | `color` | `#315846` | TOKEN MANCANTE | RESIDUO |
| 6829 | `background` | `rgba(255, 255, 255, 0.74)` | `color-mix(in srgb, var(--color-bg-elevated) 74%, transparent)` | SOSTITUITO |
| 6836 | `color` | `#315846` | TOKEN MANCANTE | RESIDUO |
| 6845 | `border` | `rgba(37, 79, 72, 0.18)` | TOKEN MANCANTE | RESIDUO |
| 6847 | `background` | `#1b261f` | TOKEN MANCANTE | RESIDUO |
| 6847 | `background` | `rgba(27, 38, 32, 0.96)` | TOKEN MANCANTE | RESIDUO |
| 6847 | `background` | `rgba(43, 69, 59, 0.92)` | TOKEN MANCANTE | RESIDUO |
| 6850 | `color` | `#f9fbf8` | TOKEN MANCANTE | RESIDUO |
| 6851 | `box-shadow` | `rgba(255, 255, 255, 0.12)` | `color-mix(in srgb, var(--color-bg-elevated) 12%, transparent)` | SOSTITUITO |
| 6856 | `color` | `rgba(249, 251, 248, 0.72)` | TOKEN MANCANTE | RESIDUO |
| 6865 | `color` | `#ffffff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 6885 | `border` | `rgba(43, 76, 66, 0.16)` | TOKEN MANCANTE | RESIDUO |
| 6887 | `background` | `rgba(255, 255, 255, 0.78)` | `color-mix(in srgb, var(--color-bg-elevated) 78%, transparent)` | SOSTITUITO |
| 6888 | `box-shadow` | `rgba(18, 30, 24, 0.08)` | TOKEN MANCANTE | RESIDUO |
| 6900 | `border` | `rgba(47, 107, 79, 0.18)` | TOKEN MANCANTE | RESIDUO |
| 6902 | `background` | `rgba(47, 107, 79, 0.08)` | TOKEN MANCANTE | RESIDUO |
| 6903 | `color` | `#315846` | TOKEN MANCANTE | RESIDUO |
| 6929 | `background` | `rgba(255, 255, 255, 0.66)` | `color-mix(in srgb, var(--color-bg-elevated) 66%, transparent)` | SOSTITUITO |
| 6971 | `border-color` | `rgba(35, 78, 64, 0.42)` | TOKEN MANCANTE | RESIDUO |
| 6972 | `background` | `#315846` | TOKEN MANCANTE | RESIDUO |
| 6973 | `color` | `#ffffff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 6974 | `box-shadow` | `rgba(29, 79, 60, 0.18)` | TOKEN MANCANTE | RESIDUO |
| 6978 | `background` | `rgba(255, 255, 255, 0.72)` | `color-mix(in srgb, var(--color-bg-elevated) 72%, transparent)` | SOSTITUITO |
| 6984 | `background` | `#254f48` | TOKEN MANCANTE | RESIDUO |
| 6991 | `background` | `rgba(255, 255, 255, 0.94)` | `color-mix(in srgb, var(--color-bg-elevated) 94%, transparent)` | SOSTITUITO |
| 6999 | `background` | `rgba(255, 255, 255, 0.68)` | `color-mix(in srgb, var(--color-bg-elevated) 68%, transparent)` | SOSTITUITO |
| 7008 | `background` | `rgba(246, 250, 246, 0.98)` | TOKEN MANCANTE | RESIDUO |
| 7008 | `background` | `rgba(252, 249, 244, 0.98)` | TOKEN MANCANTE | RESIDUO |
| 7026 | `box-shadow` | `rgba(18, 30, 24, 0.05)` | TOKEN MANCANTE | RESIDUO |
| 7030 | `border-color` | `rgba(36, 94, 74, 0.36)` | TOKEN MANCANTE | RESIDUO |
| 7031 | `box-shadow` | `#315846` | TOKEN MANCANTE | RESIDUO |
| 7031 | `box-shadow` | `rgba(18, 64, 45, 0.08)` | TOKEN MANCANTE | RESIDUO |
| 7093 | `border-color` | `rgba(79, 90, 84, 0.2)` | TOKEN MANCANTE | RESIDUO |
| 7098 | `border-color` | `rgba(36, 94, 74, 0.26)` | TOKEN MANCANTE | RESIDUO |
| 7099 | `background` | `rgba(36, 94, 74, 0.1)` | TOKEN MANCANTE | RESIDUO |
| 7100 | `color` | `#315846` | TOKEN MANCANTE | RESIDUO |
| 7104 | `border-color` | `rgba(143, 86, 33, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 7105 | `background` | `rgba(184, 123, 62, 0.12)` | TOKEN MANCANTE | RESIDUO |
| 7106 | `color` | `#704414` | TOKEN MANCANTE | RESIDUO |
| 7110 | `border-color` | `rgba(36, 94, 74, 0.26)` | TOKEN MANCANTE | RESIDUO |
| 7111 | `background` | `rgba(36, 94, 74, 0.1)` | TOKEN MANCANTE | RESIDUO |
| 7112 | `color` | `#315846` | TOKEN MANCANTE | RESIDUO |
| 7260 | `box-shadow` | `rgba(17, 26, 22, 0.06)` | TOKEN MANCANTE | RESIDUO |
| 7338 | `border-color` | `rgba(47, 104, 79, 0.24)` | TOKEN MANCANTE | RESIDUO |
| 7343 | `border-color` | `rgba(138, 100, 38, 0.3)` | TOKEN MANCANTE | RESIDUO |
| 7490 | `--panel-bg` | `rgba(255, 255, 255, 0.94)` | - | RIMOSSO (blocco :root morto) |
| 7491 | `--panel-border` | `rgba(25, 39, 52, 0.12)` | - | RIMOSSO (blocco :root morto) |
| 7492 | `--panel-border-strong` | `rgba(25, 39, 52, 0.2)` | - | RIMOSSO (blocco :root morto) |
| 7495 | `--panel-shadow` | `rgba(18, 30, 44, 0.08)` | - | RIMOSSO (blocco :root morto) |
| 7496 | `--panel-section-bg` | `rgba(248, 250, 248, 0.92)` | - | RIMOSSO (blocco :root morto) |
| 7497 | `--panel-section-bg-strong` | `#ffffff` | - | RIMOSSO (blocco :root morto) |
| 7498 | `--warning-bg` | `rgba(184, 123, 62, 0.1)` | - | RIMOSSO (blocco :root morto) |
| 7499 | `--warning-border` | `rgba(184, 123, 62, 0.24)` | - | RIMOSSO (blocco :root morto) |
| 7500 | `--error-bg` | `rgba(172, 61, 47, 0.1)` | - | RIMOSSO (blocco :root morto) |
| 7501 | `--error-border` | `rgba(172, 61, 47, 0.24)` | - | RIMOSSO (blocco :root morto) |
| 7502 | `--success-bg` | `rgba(34, 111, 84, 0.1)` | - | RIMOSSO (blocco :root morto) |
| 7503 | `--success-border` | `rgba(34, 111, 84, 0.22)` | - | RIMOSSO (blocco :root morto) |
| 7504 | `--text-main` | `#17251f` | - | RIMOSSO (blocco :root morto) |
| 7505 | `--text-muted` | `rgba(23, 37, 31, 0.62)` | - | RIMOSSO (blocco :root morto) |
| 7578 | `background` | `rgba(239, 244, 240, 0.84)` | TOKEN MANCANTE | RESIDUO |
| 7607 | `background` | `rgba(255, 255, 255, 0.72)` | `color-mix(in srgb, var(--color-bg-elevated) 72%, transparent)` | SOSTITUITO |
| 7616 | `border-color` | `rgba(28, 91, 68, 0.18)` | TOKEN MANCANTE | RESIDUO |
| 7617 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 7618 | `color` | `#1f6b4f` | TOKEN MANCANTE | RESIDUO |
| 7619 | `box-shadow` | `rgba(22, 39, 31, 0.08)` | TOKEN MANCANTE | RESIDUO |
| 7704 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 7725 | `border-color` | `#1f6b4f` | TOKEN MANCANTE | RESIDUO |
| 7726 | `color` | `#1f6b4f` | TOKEN MANCANTE | RESIDUO |
| 7762 | `background` | `rgba(255, 255, 255, 0.72)` | `color-mix(in srgb, var(--color-bg-elevated) 72%, transparent)` | SOSTITUITO |
| 7772 | `background` | `rgba(31, 107, 79, 0.1)` | TOKEN MANCANTE | RESIDUO |
| 7773 | `color` | `#1f6b4f` | TOKEN MANCANTE | RESIDUO |
| 7820 | `border-color` | `rgba(184, 123, 62, 0.38)` | TOKEN MANCANTE | RESIDUO |
| 7821 | `background` | `rgba(184, 123, 62, 0.14)` | TOKEN MANCANTE | RESIDUO |
| 7844 | `background` | `rgba(255, 255, 255, 0.72)` | `color-mix(in srgb, var(--color-bg-elevated) 72%, transparent)` | SOSTITUITO |
| 7872 | `background` | `rgba(255, 255, 255, 0.64)` | `color-mix(in srgb, var(--color-bg-elevated) 64%, transparent)` | SOSTITUITO |
| 7889 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 7902 | `border-color` | `rgba(31, 107, 79, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 7903 | `background` | `rgba(245, 250, 247, 0.98)` | TOKEN MANCANTE | RESIDUO |
| 7908 | `border-color` | `rgba(31, 107, 79, 0.34)` | TOKEN MANCANTE | RESIDUO |
| 7909 | `background` | `rgba(31, 107, 79, 0.1)` | TOKEN MANCANTE | RESIDUO |
| 7910 | `color` | `#1f6b4f` | TOKEN MANCANTE | RESIDUO |
| 7939 | `background` | `rgba(248, 250, 248, 0.98)` | TOKEN MANCANTE | RESIDUO |
| 7971 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 7979 | `border-color` | `rgba(31, 107, 79, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 7980 | `background` | `rgba(245, 250, 247, 0.98)` | TOKEN MANCANTE | RESIDUO |
| 7987 | `border-color` | `rgba(31, 107, 79, 0.34)` | TOKEN MANCANTE | RESIDUO |
| 7988 | `background` | `rgba(31, 107, 79, 0.09)` | TOKEN MANCANTE | RESIDUO |
| 8006 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 8044 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 8054 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 8072 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 8077 | `--diagram-canvas-fill` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 8078 | `--diagram-node-fill` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 8083 | `--diagram-translation-pending` | `#ff3b30` | TOKEN MANCANTE | RESIDUO |
| 8084 | `--diagram-translation-blocked` | `#ff3b30` | TOKEN MANCANTE | RESIDUO |

## src/styles/panels.css

| Riga | Proprieta | Valore | Token | Stato |
|---:|---|---|---|---|
| 2 | `--panel-bg` | `#f6faf5` | - | RIMOSSO (blocco :root morto) |
| 3 | `--panel-surface` | `#ffffff` | - | RIMOSSO (blocco :root morto) |
| 4 | `--panel-surface-active` | `#e7f0e9` | - | RIMOSSO (blocco :root morto) |
| 5 | `--panel-border` | `#cbd8cf` | - | RIMOSSO (blocco :root morto) |
| 6 | `--panel-border-strong` | `#557267` | - | RIMOSSO (blocco :root morto) |
| 7 | `--panel-text` | `#162820` | - | RIMOSSO (blocco :root morto) |
| 8 | `--panel-muted` | `#65766f` | - | RIMOSSO (blocco :root morto) |
| 151 | `background` | `#f4f8f4` | TOKEN MANCANTE | RESIDUO |
| 160 | `border-color` | `rgba(85, 114, 103, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 267 | `border-color` | `rgba(85, 114, 103, 0.4)` | TOKEN MANCANTE | RESIDUO |
| 282 | `background` | `#f6fbf7` | TOKEN MANCANTE | RESIDUO |
| 288 | `background` | `#fbf8f7` | TOKEN MANCANTE | RESIDUO |
| 373 | `color` | `#9d4338` | TOKEN MANCANTE | RESIDUO |
| 377 | `color` | `#8b6428` | TOKEN MANCANTE | RESIDUO |
| 381 | `color` | `#2f6852` | TOKEN MANCANTE | RESIDUO |
| 394 | `background` | `#f4f8f4` | TOKEN MANCANTE | RESIDUO |
| 395 | `border-color` | `rgba(85, 114, 103, 0.34)` | TOKEN MANCANTE | RESIDUO |
| 403 | `color` | `#95a39b` | TOKEN MANCANTE | RESIDUO |
| 411 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 497 | `border-color` | `rgba(139, 100, 40, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 498 | `background` | `#f9f5ed` | TOKEN MANCANTE | RESIDUO |
| 503 | `border-color` | `rgba(47, 104, 82, 0.24)` | TOKEN MANCANTE | RESIDUO |
| 504 | `background` | `#eef7f2` | TOKEN MANCANTE | RESIDUO |
| 609 | `box-shadow` | `rgba(85, 114, 103, 0.24)` | TOKEN MANCANTE | RESIDUO |
| 653 | `background` | `#eef3ef` | TOKEN MANCANTE | RESIDUO |
| 665 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 687 | `background` | `#f4f8f4` | TOKEN MANCANTE | RESIDUO |
| 692 | `border-color` | `rgba(85, 114, 103, 0.3)` | TOKEN MANCANTE | RESIDUO |
| 706 | `background` | `#f3eadb` | TOKEN MANCANTE | RESIDUO |
| 707 | `color` | `#805c21` | TOKEN MANCANTE | RESIDUO |
| 738 | `border-color` | `rgba(85, 114, 103, 0.38)` | TOKEN MANCANTE | RESIDUO |
| 743 | `border-color` | `rgba(139, 100, 40, 0.26)` | TOKEN MANCANTE | RESIDUO |
| 2105 | `border-color` | `rgba(85, 114, 103, 0.32)` | TOKEN MANCANTE | RESIDUO |
| 2130 | `border` | `rgba(85, 114, 103, 0.36)` | TOKEN MANCANTE | RESIDUO |
| 2226 | `border-color` | `rgba(85, 114, 103, 0.36)` | TOKEN MANCANTE | RESIDUO |
| 2351 | `--studio-bg` | `#edf1ec` | - | RIMOSSO (blocco :root morto) |
| 2352 | `--studio-surface` | `#ffffff` | - | RIMOSSO (blocco :root morto) |
| 2353 | `--studio-surface-muted` | `#f4f6f3` | - | RIMOSSO (blocco :root morto) |
| 2354 | `--studio-border` | `#d5ddd4` | - | RIMOSSO (blocco :root morto) |
| 2355 | `--studio-border-strong` | `#b9c6bc` | - | RIMOSSO (blocco :root morto) |
| 2356 | `--studio-ink` | `#111a16` | - | RIMOSSO (blocco :root morto) |
| 2357 | `--studio-muted` | `#5f6d65` | - | RIMOSSO (blocco :root morto) |
| 2358 | `--studio-faint` | `#839088` | - | RIMOSSO (blocco :root morto) |
| 2359 | `--studio-accent` | `#254f48` | - | RIMOSSO (blocco :root morto) |
| 2360 | `--studio-accent-strong` | `#193a35` | - | RIMOSSO (blocco :root morto) |
| 2361 | `--studio-accent-soft` | `rgba(37, 79, 72, 0.1)` | - | RIMOSSO (blocco :root morto) |
| 2362 | `--studio-danger` | `#b64236` | - | RIMOSSO (blocco :root morto) |
| 2363 | `--studio-danger-soft` | `rgba(182, 66, 54, 0.1)` | - | RIMOSSO (blocco :root morto) |
| 2364 | `--studio-warning` | `#a96f16` | - | RIMOSSO (blocco :root morto) |
| 2365 | `--studio-warning-soft` | `rgba(169, 111, 22, 0.12)` | - | RIMOSSO (blocco :root morto) |
| 2366 | `--studio-success` | `#2f7353` | - | RIMOSSO (blocco :root morto) |
| 2367 | `--studio-success-soft` | `rgba(47, 115, 83, 0.1)` | - | RIMOSSO (blocco :root morto) |
| 2371 | `--studio-shadow-sm` | `rgba(17, 26, 22, 0.05)` | - | RIMOSSO (blocco :root morto) |
| 2372 | `--studio-shadow-panel` | `rgba(17, 26, 22, 0.04)` | - | RIMOSSO (blocco :root morto) |
| 2372 | `--studio-shadow-panel` | `rgba(17, 26, 22, 0.06)` | - | RIMOSSO (blocco :root morto) |
| 2373 | `--studio-focus-ring` | `rgba(37, 79, 72, 0.2)` | - | RIMOSSO (blocco :root morto) |
| 2375 | `--editor-shell-bg-muted` | `#e6ece5` | - | RIMOSSO (blocco :root morto) |
| 2385 | `--editor-topbar` | `#ffffff` | - | RIMOSSO (blocco :root morto) |
| 2399 | `--panel-surface-active` | `#eef4f0` | - | RIMOSSO (blocco :root morto) |
| 2408 | `--diagram-canvas-fill` | `#fafafa` | - | RIMOSSO (blocco :root morto) |
| 2409 | `--diagram-grid` | `rgba(17, 26, 22, 0.045)` | - | RIMOSSO (blocco :root morto) |
| 2410 | `--diagram-stroke` | `#26322d` | - | RIMOSSO (blocco :root morto) |
| 2413 | `--diagram-selection-fill` | `rgba(37, 79, 72, 0.08)` | - | RIMOSSO (blocco :root morto) |
| 2418 | `--diagram-warning-fill` | `rgba(169, 111, 22, 0.14)` | - | RIMOSSO (blocco :root morto) |
| 2420 | `--diagram-error-fill` | `rgba(182, 66, 54, 0.12)` | - | RIMOSSO (blocco :root morto) |
| 2435 | `scrollbar-color` | `rgba(95, 109, 101, 0.34)` | TOKEN MANCANTE | RESIDUO |
| 2448 | `background` | `rgba(95, 109, 101, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 2455 | `background-color` | `rgba(37, 79, 72, 0.42)` | TOKEN MANCANTE | RESIDUO |
| 2466 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 2467 | `--diagram-canvas-fill` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 2468 | `--diagram-node-fill` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 2469 | `--diagram-stroke` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 2470 | `--diagram-text` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 2471 | `--diagram-selection-stroke` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 2472 | `--diagram-selection-fill` | `rgba(17, 17, 17, 0.08)` | TOKEN MANCANTE | RESIDUO |
| 2473 | `--diagram-focus` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 2474 | `--diagram-drag` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 2475 | `--diagram-pending` | `#111111` | TOKEN MANCANTE | RESIDUO |
| 2482 | `background` | `#ffffff` | `var(--color-bg-elevated)` | SOSTITUITO |
| 2494 | `color` | `#ffffff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 2540 | `border-color` | `rgba(37, 79, 72, 0.32)` | TOKEN MANCANTE | RESIDUO |
| 2549 | `color` | `#ffffff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 2568 | `background` | `rgba(255, 255, 255, 0.78)` | `color-mix(in srgb, var(--color-bg-elevated) 78%, transparent)` | SOSTITUITO |
| 2591 | `color` | `#ffffff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 2592 | `box-shadow` | `rgba(37, 79, 72, 0.18)` | TOKEN MANCANTE | RESIDUO |
| 2596 | `color` | `rgba(95, 109, 101, 0.48)` | TOKEN MANCANTE | RESIDUO |
| 2654 | `--diagram-canvas-fill` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 2655 | `--diagram-node-fill` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 2656 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 2673 | `background` | `rgba(255, 255, 255, 0.92)` | `color-mix(in srgb, var(--color-bg-elevated) 92%, transparent)` | SOSTITUITO |
| 2762 | `border-color` | `rgba(37, 79, 72, 0.34)` | TOKEN MANCANTE | RESIDUO |
| 2845 | `border-color` | `rgba(169, 111, 22, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 2850 | `border-color` | `rgba(182, 66, 54, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 2855 | `border-color` | `rgba(47, 115, 83, 0.24)` | TOKEN MANCANTE | RESIDUO |
| 2863 | `background` | `#fbfcfb` | `var(--color-bg-editor)` | SOSTITUITO |
| 2868 | `background` | `#f1f4f0` | TOKEN MANCANTE | RESIDUO |
| 2873 | `background` | `#fbfcfb` | `var(--color-bg-editor)` | SOSTITUITO |
| 2885 | `background` | `#f7f9f6` | TOKEN MANCANTE | RESIDUO |
| 2948 | `border-color` | `rgba(169, 111, 22, 0.24)` | TOKEN MANCANTE | RESIDUO |
| 2950 | `color` | `#6f470d` | TOKEN MANCANTE | RESIDUO |
| 2954 | `border-color` | `rgba(182, 66, 54, 0.24)` | TOKEN MANCANTE | RESIDUO |
| 2956 | `color` | `#7c2c24` | TOKEN MANCANTE | RESIDUO |
| 2960 | `border-color` | `rgba(47, 115, 83, 0.22)` | TOKEN MANCANTE | RESIDUO |
| 2962 | `color` | `#20533b` | TOKEN MANCANTE | RESIDUO |
| 3098 | `border-color` | `rgba(37, 79, 72, 0.34)` | TOKEN MANCANTE | RESIDUO |
| 3200 | `border-color` | `rgba(37, 79, 72, 0.34)` | TOKEN MANCANTE | RESIDUO |
| 3657 | `box-shadow` | `rgba(12, 18, 15, 0.16)` | TOKEN MANCANTE | RESIDUO |
| 4306 | `--diagram-canvas-fill` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4307 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4315 | `--diagram-canvas-fill` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4316 | `background` | `#dfe3dc` | `var(--color-bg-diagram-canvas)` | SOSTITUITO |
| 4368 | `color` | `#fff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 4396 | `border-color` | `rgba(37, 79, 72, 0.34)` | TOKEN MANCANTE | RESIDUO |
| 5518 | `border` | `rgba(255, 255, 255, 0.12)` | `color-mix(in srgb, var(--color-bg-elevated) 12%, transparent)` | SOSTITUITO |
| 5520 | `background` | `#1f1f1f` | TOKEN MANCANTE | RESIDUO |
| 5521 | `box-shadow` | `rgba(0, 0, 0, 0.28)` | TOKEN MANCANTE | RESIDUO |
| 5537 | `color` | `#ffffff` | `var(--color-text-on-accent)` | SOSTITUITO |
| 5547 | `background` | `rgba(255, 255, 255, 0.1)` | `color-mix(in srgb, var(--color-bg-elevated) 10%, transparent)` | SOSTITUITO |
| 5551 | `background` | `rgba(255, 255, 255, 0.16)` | `color-mix(in srgb, var(--color-bg-elevated) 16%, transparent)` | SOSTITUITO |

## src/styles/project-explorer.css

| Riga | Proprieta | Valore | Token | Stato |
|---:|---|---|---|---|
| 645 | `background` | `#d3d9d1` | TOKEN MANCANTE | INVENTARIO |
| 645 | `background` | `#d3d9d1` | TOKEN MANCANTE | INVENTARIO |
| 645 | `background` | `rgba(238, 242, 237, 0.86)` | TOKEN MANCANTE | INVENTARIO |
| 645 | `background` | `rgba(238, 242, 237, 0.86)` | TOKEN MANCANTE | INVENTARIO |
| 1068 | `border` | `rgba(220, 38, 38, 0.35)` | TOKEN MANCANTE | INVENTARIO |
| 1069 | `background` | `rgba(220, 38, 38, 0.08)` | TOKEN MANCANTE | INVENTARIO |
| 1104 | `border-color` | `rgba(220, 38, 38, 0.44)` | TOKEN MANCANTE | INVENTARIO |
| 1105 | `color` | `#dc2626` | TOKEN MANCANTE | INVENTARIO |
| 1815 | `--workspace-card-shadow` | `rgba(26, 31, 28, 0.07)` | TOKEN MANCANTE | INVENTARIO |
| 1817 | `--workspace-hero-glow` | `rgba(61, 122, 110, 0.14)` | TOKEN MANCANTE | INVENTARIO |
| 1828 | `box-shadow` | `rgba(26, 31, 28, 0.03)` | TOKEN MANCANTE | INVENTARIO |
| 1834 | `background` | `rgba(255, 255, 255, 0.72)` | `color-mix(in srgb, var(--color-bg-elevated) 72%, transparent)` | INVENTARIO (token esatto) |
| 1837 | `box-shadow` | `rgba(26, 31, 28, 0.03)` | TOKEN MANCANTE | INVENTARIO |
| 1932 | `background` | `rgba(255, 255, 255, 0.58)` | `color-mix(in srgb, var(--color-bg-elevated) 58%, transparent)` | INVENTARIO (token esatto) |
| 2016 | `box-shadow` | `rgba(61, 122, 110, 0.16)` | TOKEN MANCANTE | INVENTARIO |
| 2259 | `background` | `rgba(255, 255, 255, 0.7)` | `color-mix(in srgb, var(--color-bg-elevated) 70%, transparent)` | INVENTARIO (token esatto) |
| 2416 | `background` | `rgba(255, 255, 255, 0.56)` | `color-mix(in srgb, var(--color-bg-elevated) 56%, transparent)` | INVENTARIO (token esatto) |
| 2524 | `filter` | `rgba(16, 80, 72, 0.18)` | TOKEN MANCANTE | INVENTARIO |
| 2568 | `background` | `rgba(255, 255, 255, 0.72)` | `color-mix(in srgb, var(--color-bg-elevated) 72%, transparent)` | INVENTARIO (token esatto) |
| 2803 | `background` | `rgba(61, 122, 110, 0.1)` | TOKEN MANCANTE | INVENTARIO |

## src/styles/workspace-shell.css

| Riga | Proprieta | Valore | Token | Stato |
|---:|---|---|---|---|
| 13 | `border-bottom` | `#080a09` | TOKEN MANCANTE | INVENTARIO |
| 15 | `color` | `#f1f5f2` | TOKEN MANCANTE | INVENTARIO |
| 50 | `color` | `rgba(241, 245, 242, 0.72)` | TOKEN MANCANTE | INVENTARIO |
| 62 | `color` | `#ffffff` | `var(--color-text-on-accent)` | INVENTARIO (token esatto) |
| 67 | `color` | `rgba(241, 245, 242, 0.34)` | TOKEN MANCANTE | INVENTARIO |
| 75 | `color` | `rgba(241, 245, 242, 0.7)` | TOKEN MANCANTE | INVENTARIO |
| 79 | `color` | `#e4b466` | TOKEN MANCANTE | INVENTARIO |
| 89 | `border` | `rgba(255, 255, 255, 0.16)` | `color-mix(in srgb, var(--color-bg-elevated) 16%, transparent)` | INVENTARIO (token esatto) |
| 90 | `background` | `rgba(255, 255, 255, 0.075)` | `color-mix(in srgb, var(--color-bg-elevated) 7.5%, transparent)` | INVENTARIO (token esatto) |
| 91 | `color` | `rgba(255, 255, 255, 0.82)` | `color-mix(in srgb, var(--color-text-on-accent) 82%, transparent)` | INVENTARIO (token esatto) |
| 96 | `border-color` | `rgba(255, 255, 255, 0.28)` | `color-mix(in srgb, var(--color-bg-elevated) 28%, transparent)` | INVENTARIO (token esatto) |
| 97 | `background` | `rgba(255, 255, 255, 0.12)` | `color-mix(in srgb, var(--color-bg-elevated) 12%, transparent)` | INVENTARIO (token esatto) |
| 113 | `border` | `rgba(255, 255, 255, 0.16)` | `color-mix(in srgb, var(--color-bg-elevated) 16%, transparent)` | INVENTARIO (token esatto) |
| 115 | `background` | `rgba(0, 0, 0, 0.18)` | TOKEN MANCANTE | INVENTARIO |
| 116 | `color` | `rgba(255, 255, 255, 0.62)` | `color-mix(in srgb, var(--color-text-on-accent) 62%, transparent)` | INVENTARIO (token esatto) |
| 311 | `color` | `rgba(241, 245, 242, 0.78)` | TOKEN MANCANTE | INVENTARIO |
| 318 | `color` | `rgba(241, 245, 242, 0.54)` | TOKEN MANCANTE | INVENTARIO |
| 324 | `color` | `rgba(241, 245, 242, 0.88)` | TOKEN MANCANTE | INVENTARIO |

## src/styles/activity-rail.css

| Riga | Proprieta | Valore | Token | Stato |
|---:|---|---|---|---|
| 13 | `border-right` | `#111613` | TOKEN MANCANTE | INVENTARIO |
| 15 | `color` | `rgba(237, 243, 239, 0.68)` | TOKEN MANCANTE | INVENTARIO |
| 29 | `background` | `rgba(255, 255, 255, 0.065)` | `color-mix(in srgb, var(--color-bg-elevated) 6.5%, transparent)` | INVENTARIO (token esatto) |
| 30 | `color` | `#ffffff` | `var(--color-text-on-accent)` | INVENTARIO (token esatto) |
| 35 | `background` | `rgba(104, 179, 160, 0.13)` | TOKEN MANCANTE | INVENTARIO |
| 36 | `color` | `#ffffff` | `var(--color-text-on-accent)` | INVENTARIO (token esatto) |
| 45 | `background` | `#73bbaa` | TOKEN MANCANTE | INVENTARIO |
| 57 | `color` | `#ffffff` | `var(--color-text-on-accent)` | INVENTARIO (token esatto) |
| 64 | `border-top` | `rgba(255, 255, 255, 0.08)` | `color-mix(in srgb, var(--color-bg-elevated) 8%, transparent)` | INVENTARIO (token esatto) |

## src/styles/app-command-bar.css

| Riga | Proprieta | Valore | Token | Stato |
|---:|---|---|---|---|
| 88 | `border-color` | `rgba(255, 255, 255, 0.12)` | `color-mix(in srgb, var(--color-bg-elevated) 12%, transparent)` | INVENTARIO (token esatto) |
| 89 | `background` | `#1f1f1f` | TOKEN MANCANTE | INVENTARIO |
| 90 | `color` | `#ffffff` | `var(--color-text-on-accent)` | INVENTARIO (token esatto) |
| 91 | `box-shadow` | `rgba(0, 0, 0, 0.28)` | TOKEN MANCANTE | INVENTARIO |
| 96 | `color` | `#ffffff` | `var(--color-text-on-accent)` | INVENTARIO (token esatto) |
| 101 | `background` | `rgba(255, 255, 255, 0.1)` | `color-mix(in srgb, var(--color-bg-elevated) 10%, transparent)` | INVENTARIO (token esatto) |
| 105 | `background` | `rgba(255, 255, 255, 0.16)` | `color-mix(in srgb, var(--color-bg-elevated) 16%, transparent)` | INVENTARIO (token esatto) |

## src/styles/panels-workspace.css

| Riga | Proprieta | Valore | Token | Stato |
|---:|---|---|---|---|
| 166 | `color` | `#ffffff` | `var(--color-text-on-accent)` | INVENTARIO (token esatto) |

## src/styles/responsive.css

| Riga | Proprieta | Valore | Token | Stato |
|---:|---|---|---|---|
| 66 | `background` | `rgba(7, 11, 9, 0.28)` | TOKEN MANCANTE | INVENTARIO |

## Debito tipografico (font-size hardcoded, tutti i CSS)

Scala introdotta in Fase A3: `--font-size-2xs..xl` = 0.68 / 0.72 / 0.76 / 0.82 / 0.9 / 1 rem;
pesi `--font-weight-regular..heavy` = 400/500/600/700/800; line-height 1 / 1.2 / 1.35 / 1.45 / 1.55.
La **convergenza dei valori fuori scala e un cambio visivo**: da approvare nelle fasi successive.

| font-size | Occorrenze | Sulla scala? | Convergenza proposta (Fase B) |
|---|---:|---|---|
| 0.72rem | 95 | si -> `--font-size-xs` | sostituzione diretta (identica) |
| 0.78rem | 73 | no | `--font-size-sm` (cambio visivo) |
| 0.82rem | 58 | si -> `--font-size-md` | sostituzione diretta (identica) |
| 0.68rem | 58 | si -> `--font-size-2xs` | sostituzione diretta (identica) |
| 0.76rem | 58 | si -> `--font-size-sm` | sostituzione diretta (identica) |
| 0.74rem | 55 | no | `--font-size-sm` (cambio visivo) |
| 0.84rem | 41 | no | `--font-size-md` (cambio visivo) |
| 0.8rem | 39 | no | `--font-size-md` (cambio visivo) |
| 0.7rem | 38 | no | `--font-size-xs` (cambio visivo) |
| 0.9rem | 25 | si -> `--font-size-lg` | sostituzione diretta (identica) |
| 0.88rem | 23 | no | `--font-size-lg` (cambio visivo) |
| 0.92rem | 21 | no | `--font-size-lg` (cambio visivo) |
| 1rem | 20 | si -> `--font-size-xl` | sostituzione diretta (identica) |
| 0.66rem | 17 | no | `--font-size-2xs` (cambio visivo) |
| 0.86rem | 16 | no | `--font-size-lg` (cambio visivo) |
| 0.75rem | 14 | no | `--font-size-sm` (cambio visivo) |
| 0.73rem | 11 | no | `--font-size-xs` (cambio visivo) |
| 0.95rem | 9 | no | `--font-size-lg` (cambio visivo) |
| 0.71rem | 8 | no | `--font-size-xs` (cambio visivo) |
| 0.94rem | 6 | no | `--font-size-lg` (cambio visivo) |
| 14px | 6 | no | valutare caso per caso |
| 18px | 6 | no | valutare caso per caso |
| 0.85rem | 5 | no | `--font-size-md` (cambio visivo) |
| 0.64rem | 5 | no | `--font-size-2xs` (cambio visivo) |
| 0.62rem | 5 | no | `--font-size-2xs` (cambio visivo) |
| 12px | 4 | no | valutare caso per caso |
| 0.98rem | 4 | no | `--font-size-xl` (cambio visivo) |
| 11.5px | 4 | no | valutare caso per caso |
| 0.79rem | 4 | no | valutare caso per caso |
| 1.08rem | 3 | no | valutare caso per caso |
| 1.28rem | 3 | no | valutare caso per caso |
| 1.02rem | 3 | no | valutare caso per caso |
| 1.12rem | 3 | no | valutare caso per caso |
| 0.96rem | 3 | no | valutare caso per caso |
| 0.65rem | 3 | no | valutare caso per caso |
| 10px | 3 | no | valutare caso per caso |
| 0.67rem | 3 | no | valutare caso per caso |
| 0.6rem | 3 | no | valutare caso per caso |

Font-weight fuori dai pesi canonici (750, 650, 760, 820, 850, 720, ...): ~90 occorrenze,
da convergere su 400/500/600/700/800 in Fase B (cambio visivo minimo ma reale).

## Debito dimensionale (px ricorrenti in spaziature)

| px | Occorrenze | Token |
|---|---:|---|
| 10px | 408 | `--space-2-5 (nuovo, A3)` |
| 8px | 394 | `--space-2` |
| 12px | 321 | `--space-3` |
| 6px | 203 | `--space-1-5` |
| 14px | 167 | `--space-3-5 (nuovo, A3)` |
| 16px | 151 | `--space-4` |
| 4px | 149 | `--space-1` |
| 18px | 120 | `--space-4-5 (nuovo, A3)` |
| 2px | 98 | `--space-0-5` |
| 24px | 84 | `--space-6` |
| 3px | 70 | nessuno (dimensione specifica: lasciare o creare token dedicato) |
| 30px | 63 | `--size-tree-row / --size-icon-button` |
| 7px | 61 | nessuno (dimensione specifica: lasciare o creare token dedicato) |
| 32px | 61 | `--space-8` |
| 34px | 61 | nessuno (dimensione specifica: lasciare o creare token dedicato) |
| 5px | 60 | nessuno (dimensione specifica: lasciare o creare token dedicato) |
| 9px | 58 | nessuno (dimensione specifica: lasciare o creare token dedicato) |
| 28px | 52 | `--size-button-sm (nuovo, A3)` |

La sostituzione massiva dei px nei file gia tokenizzati e meccanica ma voluminosa:
rimandata a un passaggio dedicato per mantenere i diff revisionabili.

## Audit A1 — incoerenze di naming, alias e cascata

### Sistemi di variabili paralleli individuati

| Sistema | Stato dopo Fase A |
|---|---|
| `--color-*` (tokens.css) | Canonico, unica fonte di verita |
| `--studio-*`, `--editor-*`, `--panel-*` | Alias legacy: ora definiti SOLO in tokens.css (i 6 blocchi `:root` duplicati in panels.css/editor-refactor.css sono stati eliminati in A4) |
| `--ui-*` (index.css ~9092) | Vivo, usato dai controlli workspace/command-bar: sistema parallelo con valori propri (rgba su base beige). Da unificare in Fase B |
| `--unibo-*` + tema verde alt. + blocco editor blu (index.css ~3774, ~3985, ~10304, ~11811) | Blocchi tema legacy: le definizioni `:root` perdono la cascata contro tokens.css (morte); le aree scoped sono probabilmente irraggiungibili dopo l'eliminazione del theme switcher (f2781b2). Verificare e potare in fase dedicata |

### Problemi puntuali

- `--editor-canvas-fill`: **usata 7 volte, mai definita** — risolve sempre sul fallback, e i fallback non sono coerenti tra loro (`var(--diagram-canvas-fill)` in alcuni punti, `var(--editor-panel)` in altri). Definirla in Fase B scegliendo un valore unico e un solo nome.
- `--text-main` e `--text-muted` (nomi generici, definiti storicamente in editor-refactor.css e usati anche da index.css): consolidati in tokens.css per parita di resa, ma **da deprecare** in favore di `--color-text-primary/secondary`.
- Tripla semantica per lo stesso concetto: `--editor-error` = `--studio-danger` = `--color-danger` (e analoghi warning/success). Le nuove superfici devono usare solo `--color-*`.
- Raggi: i canonici `--radius-control/panel/dialog` (4/6/10px) convivono con il linguaggio "bordi netti" (radius 0) delle superfici legacy; i legacy `--studio-radius-*`, `--editor-radius-*`, `--panel-radius` valevano 0, non erano usati e sono stati eliminati. Decidere la direzione unica in Fase B.
- Ombre: `--elevation-popover/dialog` (base rgba(19,29,24)) coprono popover, modali e dropdown; in parallelo esiste la scala legacy `--studio-shadow-sm/panel/floating/shadow` (base rgba(17,26,22)) ora consolidata in tokens.css. Due scale quasi identiche: unificare in Fase B.
- `--focus-ring` canonico (doppio anello) vs `--studio-focus-ring` legacy (anello singolo alpha): due pattern di focus diversi convivono nell'app.

## Audit A1 — contrasto WCAG AA (segnalazione, nessuna correzione in Fase A)

Soglie: 4.5:1 testo normale, 3:1 testo grande o componenti UI. Sfondi chiari: elevated #ffffff, panel #f8faf9, sidebar #f4f6f5, editor #fbfcfb, app #e8ecea.

| Coppia | Rapporto | Esito |
|---|---|---|
| `--color-text-muted` #748078 su elevated, panel, sidebar, editor, app | 4.12, 3.93, 3.79, 4.00, 3.45 | **FAIL testo normale** (usato per meta, contatori, descrizioni) |
| `--color-warning` #a8741c come testo su sfondi chiari | 3.40-4.05 | **FAIL testo**; ok come componente UI (tranne su app-bg) |
| `--color-modified` #ad6b19 come testo su sfondi chiari | 3.60-4.29 | **FAIL testo**; ok come indicatore UI (dot dirty) |
| `--color-info` #3977a8 su sidebar, app | 4.42, 4.02 | **FAIL testo** (borderline) |
| `--color-danger` #bd4b3f su app-bg | 4.15 | **FAIL testo** solo su app-bg (ok sugli altri sfondi) |
| `--color-success` #2f7857 su app-bg | 4.47 | borderline (soglia 4.5) |
| `--color-text-disabled` #9ca69f | 2.11-2.51 | fail, ma il testo disabilitato e esente da AA |
| Bianco su accent, accent-hover, danger | 5.88, 8.02, 4.95 | PASS |
| `--color-text-primary` e `--color-text-secondary` su tutti gli sfondi chiari | >= 7 | PASS |

Raccomandazione per Fase B: scurire `--color-text-muted` (target ~#66716a) e riservare warning/modified a usi non testuali, oppure scurirne le varianti testuali.

## Residui hardcoded: motivazione

I 434 residui nei due file sostituiti (57 in panels.css, 377 in editor-refactor.css) sono valori della **vecchia palette ancora renderizzata** su superfici non ancora ridisegnate (viste designer e logical, topbar scura del designer, badge di stato, tinte alpha locali). Non esiste un token con valore identico: sostituirli significherebbe cambiare i pixel (vietato in Fase A) e crearne uno per ciascuno significherebbe canonizzare la palette vecchia (~300 token senza valore semantico). Andranno convertiti **insieme al ridisegno** delle rispettive superfici (Fasi B-D), decidendo di volta in volta il token canonico di destinazione. Esempi tipici: `#fbfcfa` (x13, a un bit dal token `--color-bg-editor` #fbfcfb), `#111111` testo su topbar scura, `#35564f` e `#315846` verdi della palette precedente, tinte rgba su basi non canoniche.

## Fase D — esito della passata finale sul debito

**Misura aggiornata** (audit rieseguito): index.css 1209 occorrenze colore,
editor-refactor.css 373, panels.css 54, piccoli file vivi ~24.

### editor-refactor.css: niente più tokenizzazione meccanica sicura
L'analisi di mappatura dà **0 corrispondenze esatte** e 0 alpha-su-token sulle
373 occorrenze rimaste: le corrispondenze 1:1 furono già tokenizzate in Fase A4
(118) e con i ridisegni della Fase C. Ciò che resta è la **vecchia palette
ancora renderizzata** su superfici non ridisegnate (viste designer/logical,
badge, tinte locali): sostituirla cambierebbe i pixel, vietato dal vincolo di
parità della Fase D. Va convertita **insieme al ridisegno** di quelle superfici.

### index.css: blocchi tema legacy CONFERMATI MORTI a runtime
Il blocco "Alma Mater / UniBO" (index.css ~3773) e il blocco "editor blu"
(~10304, `--editor-accent-strong #153d6f`) ridefiniscono token e regole con una
palette rossa/blu. Verifica runtime (Fase D): `.mode-button.active` renderizza
`rgb(47,111,98)` — il **verde accent**, non il gradiente rosso UniBO — quindi le
regole scoped di quei blocchi sono morte (sovrascritte dai file importati dopo),
e le ridefinizioni `:root` perdono contro tokens.css. Sono **safe da rimuovere**
in un commit dedicato (grande riduzione di debito, ~1200 occorrenze). Rinviato
per non entrare in conflitto con la feature command-palette in sviluppo attivo
nel working tree.

### Bianchi puri tokenizzati a parità (Fase D4)
Nei due file di chrome vivi (workspace-shell.css, app-command-bar.css) i bianchi
puri sono stati portati ai token: `#ffffff` -> `--color-text-on-accent`,
`rgba(255,255,255,X)` -> `color-mix(--color-text-on-accent X%, transparent)`
(parità verificata a runtime: `color(srgb 1 1 1 / .12)` == `rgba(255,255,255,.12)`).
Restano fuori scala e documentati: `#1f1f1f` (fondo scuro proprio del menu lingua,
distinto dagli altri dropdown chiari), `#f1f5f2` e le sue varianti alpha (testo
chiaro del chrome, off-white non equivalente a nessun token), `#080a09` (bordo
quasi-nero), ombre `rgba(0,0,0,X)`.

### Contrasto: --color-text-muted corretto (Fase D1)
`#748078` -> `#636d66`: era sotto AA su ogni sfondo chiaro (3.45-4.12:1);
il nuovo valore passa 4.5:1 ovunque (min 4.51 su bg-app). Confermato da axe.

### Breakpoint: cinque valori invece di una scala
responsive.css usa 1180/900/680; i file legacy 860/640. Non unificati (cambiare
i valori sposterebbe dove i layout si riadattano = cambio di comportamento,
fuori dal vincolo "nessuna regressione"): tutti e cinque verificati senza
overflow dai test e2e responsive. Da consolidare in una scala unica in futuro.
