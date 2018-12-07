
# OstracodMultiplayer

A Node.js module for browser-based multiplayer games

Created by Jack Eisenmann

## Motivation

I have created a handful of Node.js browser games now, and I've copied a lot of code between them. Naturally I started to feel uncomfortable copying and pasting code, so I created this module.

Feel free to use this module for yourself, but I really designed it for my own use. If you have any questions, I'd be happy to answer them!

## Installation

This module requires MySQL version 5.x. To install on macOS:

```
brew install mysql@5.7
brew services start mysql@5.7
```

To install on Ubuntu, I recommend [this page](https://www.digitalocean.com/community/tutorials/how-to-install-mysql-on-ubuntu-16-04).

To install the Node.js module:

```
npm install ostracod/ostracod-multiplayer
```

Create a directory in your project named `ostracodMultiplayerConfig`. You will need to put the following files there:

* `ostracodMultiplayerConfig/schemaConfig.json`
* `ostracodMultiplayerConfig/ssl.crt`
* `ostracodMultiplayerConfig/ssl.key`
* `ostracodMultiplayerConfig/sessionSecret.txt`
* `ostracodMultiplayerConfig/databaseConfig.json`


