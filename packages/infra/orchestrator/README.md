# @sysone/orchestrator

**Local infrastructure only.** This package operates a root-supplied Compose model. It does not know which applications consume the services, where their artifacts live, or which migrations they own.

![Infrastructure lifecycle: start brings PostgreSQL and profile-discovered engines up; stop preserves volumes; clean removes only clean-labelled data; purge-models removes only model-cache-labelled volumes. Application migrations and artifacts remain outside this lifecycle.](../../../diagrams/orchestrator-lifecycle.svg)

## Commands

| Command | Effect |
|---|---|
| `./start` | Start PostgreSQL and all profile-discovered local engines |
| `./start --without-engines` | Start PostgreSQL only |
| `./start --stop` | Stop containers and preserve volumes |
| `./start --clean` | Remove containers and root-composed `clean` volumes |
| `./start --purge-models` | Remove root-composed `model-cache` volumes |
| `./start --status` | Show infrastructure services and published ports |
| `./start --logs [service] [lines]` | Show logs for one infrastructure service |

The root `/compose.yml` is the composition root. It selects concrete database and engine containers, ports, health checks, and `x-sysone-retention` cleanup groups. The generic script reads that model and contains no provider names, ports, volume names, migrations, or application commands.

## Engine discovery

A local engine is represented by a profile-gated service whose profile and service names match. The script intersects `docker compose config --profiles` with `config --services`, builds missing engine images, starts all discovered engines, and waits for health.

Provider selection is an application concern and does not affect which local services start.

## Lifecycle separation

`./start` never executes workspace migrations or cleans application output. Root composition owns cross-workspace operations:

```bash
yarn bootstrap    # infrastructure, then topological workspace migrations
yarn db:migrate   # topological migrations only
yarn clean        # fan out to workspace-owned clean commands
```

A use case can therefore be added without modifying this package.
