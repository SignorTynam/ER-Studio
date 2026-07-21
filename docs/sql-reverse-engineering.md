# SQL Reverse Engineering

Questa guida distingue i due ingressi deterministici supportati da buildER:

- **SQL testuale**: il pannello Reverse analizza `CREATE TABLE` tramite il parser documentato in [`reverse-engineering-sql.md`](./reverse-engineering-sql.md).
- **File SQLite reale**: Database Workspace legge metadata SQLite nel worker e avvia il wizard descritto in [`database-workspace.md`](./database-workspace.md).

Entrambi producono lo stesso `SqlSchemaModel`, quindi condividono conversione verso modello logico, regole molti-a-molti, layout e generazione del diagramma ER. L'ingresso SQLite evita però di ricostruire la struttura dal testo: usa le PRAGMA reali e conserva in SQL separato gli oggetti che il modello logico non rappresenta.

Nessuno dei due flussi usa AI. Warning e definizioni non convertite restano espliciti e verificabili prima dell'applicazione al progetto.
