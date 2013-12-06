[![Build Status](https://ism.stridercd.com/caseman/ism/badge)](https://ism.stridercd.com/caseman/ism/)

# ism

### Build a civilisation in an ascii world.

## Install

```
npm install -g ism && ism
```

## Create a Test Map and Browse Around

```
node script/dump-map.js -c map-config/default.json test.map
node client/client.js --map test.map
```


# Vaporware - Ideas for the game:



## Weather

### Maritime
- Ships can sail far faster across the wind or down wind than upwind (as they have to tack)
- Ships attacking from an upwind position have a tactical advantage
- Establishing trade routes along trade winds is far faster for trade.

### Rain / Fog
- Rain can cause flooding which bogs down heavy units
- Flooding reduces farm yield and can cause famine
- Rain / Fog reduces visibility adding to a tactical advantage


### Cold / Heat

- Extreme cold will sap strength from units (Don't try and besiege russia in winter...)
- Some units can only survive in certain temperature ranges (Elephants crossing alps etc.)
- Temperatures drop in winter and rise in summer. (Don't start wars in winter)
