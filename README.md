[![Build Status](https://ism.stridercd.com/caseman/ism/badge)](https://ism.stridercd.com/caseman/ism/)

# ism

### Build a civilisation in an ascii world.

Ism is a multiplayer turn-based strategy game currently in early development.
Some features include:

- Procedurally generated world
- Network multiplayer
- Console client interface
- Full mouse and keyboard controls
- Lots of crazy ideas in development :)

[![Screenshot](https://i.cloudup.com/2joYJkql68.png)](https://i.cloudup.com/2joYJkql68.png)

## Install

```
npm install -g ism
```
or if you would like to follow the currently rapid development:
```
git clone https://github.com/caseman/ism.git
cd ism
npm install
npm link
```
I try hard to make sure that everything works in the master branch, though I
can't make any guarantees!

## Running the game

Ism consists of a server and console client. To run the client once installed
simply use:
```
ism
```
For local games, the client will automatically launch a local server for you.
To run a server separately, you can use:
```
ism-server
```
By default this will listen on all interfaces on port 5557. This is
configurable via command line options:
```
Usage: ism-server

Options:
  -h, --host      host name or address to listen on                           [default: "0.0.0.0"]
  -p, --port      port number to listen on                                    [default: 5557]
  -v, --verbose   More verbose logging of client connections
  --debug         Debug logging of all client/server activity
  --version       Output the software version and exit
  -d, --database  path to game database directory (will be created on start)  [default: "/home/caseman/.ism/db"]
```
Note that only one server can be running at a time for each game database.
If you are running a server locally with the default database, the client
will automatically use it for local games.

## Saving games

All games are automatically saved to the server's database. As the game
progresses the database is automatically updated, thus there is no
"save game" command. Any game that you have started on a server can be
resumed where it left off. This means that the client and server can
be restarted at will without losing anything.

Currently a game can only be resumed from the client that initially joined
it. In time the ability to resume your games from anywhere will be
implemented.

## Gameplay

There is currently very little gameplay implemented, as the focus has been on
getting the map generation, client/server infrastructure and client user
interface built. Basically all you can do is select your people, move them
around to explore the map, and scroll the map view.

The mouse is supported, though all functions are available via the keyboard.

### Keyboard Controls

*ESC*: Return to title screen
*,*: Select previous person
*.*: Select next person

*h*: Move left
*l*: Move right
*j*: Move down
*k*: Move up
*y*, *u*, *b*, *n*: Move diagonally

Hold down `CTRL` or `SHIFT` with the movement keys to scroll. You can also
scroll using the arrow keys.


