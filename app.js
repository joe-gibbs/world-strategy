"use strict";

import terrain from './src/terrain.js';
import DroppedItem from './src/classes/droppedItem.js';
import GameMap from './src/classes/gameMap.js';
import Player from './src/classes/player.js';
import MapGenerator from './src/classes/mapGenerator.js';
import fps from './src/fpsCounter.js';
import MapRenderer from './src/classes/mapRenderer.js';
import items from './src/items.js';
import UiRenderer from './src/classes/uiRenderer.js';

let gameState = {menu: true, game: false};

const MapSize = 128;

/** @type {GameMap} */
let map = new GameMap(new MapGenerator().generate(MapSize, new SimplexNoise())); //218  - 256 are good Sizes for visibility and reduced blur.

/** @type {Tile} */
let centerTile;

/** @type {Player} */
let player;

/** @type {HTMLElement} */
let gameCanvas;

/** @type {CanvasRenderingContext2D} */
let canvas;

/** @type {MapRenderer} */
let mapRenderer;

/** @type {UiRenderer} */
let uiRenderer;

/** @type {Number} */
let tileSize, canvasWidth, canvasHeight;

let mouseX = 0, mouseY = 0;

/** @type {String[]} */
let kMap = []; // You could also use an array

document.getElementById('gameButton').onclick = function(){
    gameState.menu = false;
    gameState.game = true;
    document.getElementById('menu').style.display = "none";
    console.log('toggle');
    startGame();
}


//Main function, put stuff here
function startGame() {

    /**
     * Handles inputs that you want done as a continuous series
     * @param {String[]} kMap 
     */
    function handleAxisMappings(kMap)
    {
        if (kMap['ArrowLeft']) {
            centerTile = player.move(0.1, 0, map)
        }
        if (kMap['ArrowUp']) {
            centerTile = player.move(0, 0.1, map)
        }
        if (kMap['ArrowRight']) {
            centerTile = player.move(-0.1, 0, map)
        }
        if (kMap['ArrowDown']) {
            centerTile = player.move(0, -0.1, map)
        }
        if (kMap['TouchVector']) {
            centerTile = player.move(-kMap['TouchVector'].x / 20, kMap['TouchVector'].y / 20, map);
        }
    }

    /**
     * Handles inputs where you only want a single action to be taken
     * @param {String[]} kMap 
     */
    function handleActionMappings(kMap) {
        if (kMap['KeyG']) {
            player.showMap = false;
            player.showCraftingMenu = !player.showCraftingMenu;
        }
        if (kMap['Escape']) {
            player.showCraftingMenu = false;
            player.showMap = false;
        }
        if (kMap['KeyA']){
            player.switchItems();
        }
        if (kMap['KeyD']) {
            player.dropEquipped(map.droppedItems);
        }
        if (kMap['Enter'] || kMap['KeyS'] || kMap['KeyE']) {
            player.showCraftingMenu = false;
            if(player.pickup(map.droppedItems)){
                if(player.equipped === items.map){
                    console.log(player.equipped, items.map);
                    player.switchItems();
                }
            }
            player.chop(map);
        }
    }

    //Setup
    function setup() { 
        let fruitNum = MapSize/15;
        let treasure;
        try {
            centerTile = map.chooseRandomTile(terrain.LAND);
            treasure = map.chooseRandomTile(terrain.LAND);
            for(let i = 0; i < fruitNum; i++){
                let foundTile = map.chooseRandomTile(terrain.LAND);
                console.log(foundTile.x, foundTile.y);
                map.droppedItems.push(new DroppedItem(foundTile.x, foundTile.y, items.food));
            }
            
        } catch (error) {
            location.reload();
        }       
        treasure.type = terrain.TREASURE;
        map.tiles[map.tiles[treasure.x][treasure.y].x + 1][map.tiles[treasure.x][treasure.y].y + 1].type = terrain.TREASURE;
        map.tiles[map.tiles[treasure.x][treasure.y].x - 1][map.tiles[treasure.x][treasure.y].y - 1].type = terrain.TREASURE;
        map.tiles[map.tiles[treasure.x][treasure.y].x + 1][map.tiles[treasure.x][treasure.y].y - 1].type = terrain.TREASURE;
        map.tiles[map.tiles[treasure.x][treasure.y].x - 1][map.tiles[treasure.x][treasure.y].y + 1].type = terrain.TREASURE;
        let treasureLocation = {x: treasure.x, y: treasure.y};


        let borders = centerTile.bordering(centerTile.x, centerTile.y, map.tiles, 2);
        //random location near player for treasure
        // for (let i = 0; i < borders.length; i++) {
        //     if (borders[i].type.walkable) {
        //         map.tiles[borders[i].x][borders[i].y].type = terrain.TREASURE;
        //         map.tiles[borders[i].x + 1][borders[i].y + 1].type = terrain.TREASURE;
        //         map.tiles[borders[i].x - 1][borders[i].y - 1].type = terrain.TREASURE;
        //         map.tiles[borders[i].x + 1][borders[i].y - 1].type = terrain.TREASURE;
        //         map.tiles[borders[i].x - 1][borders[i].y + 1].type = terrain.TREASURE;

                
        //         treasureLocation = {x: map.tiles[borders[i].x][borders[i].y].x, y: map.tiles[borders[i].x][borders[i].y].y};
        //         console.log(map.tiles[borders[i].x][borders[i].y].type);
        //         break;
        //     }
        // }

        //Axe spawns near player.
        for (let i = 0; i < borders.length; i++) {
            if (borders[i].type.walkable) {
                map.droppedItems.push(new DroppedItem(borders[i].x + 1, borders[i].y + 1, items.axe));
                map.droppedItems.push(new DroppedItem(borders[i].x + 2, borders[i].y + 1, items.map));   
                map.droppedItems.push(new DroppedItem(borders[i].x + 1, borders[i].y + 2, items.food));  
                break;
            }
        }

        player = new Player(centerTile.x, centerTile.y, treasureLocation);

        mapRenderer = new MapRenderer(tileSize, canvas, map, player);

        uiRenderer = new UiRenderer(player, canvas);

        uiRenderer.treasureMap.src = (MapGenerator.generateTreasureMap(canvas, map.tiles, treasureLocation));

        /**
         * Enable touch controls for touchscreen
         */
        let dynamic;
        let touched = false;

        window.addEventListener('touchstart', function() {
            if (!touched) {
                dynamic = nipplejs.create({
                    zone: document.getElementById('dynamic'),
                    color: 'gray'
                });
                touched = true;
                dynamic.on('move', function(evt, data) {     
                    kMap['TouchVector'] = data.vector;
                });
        
                dynamic.on('end', function(evt, data) {   
                    kMap['TouchVector'] = {
                        x: 0,
                        y: 0,
                    };
                });
            }
        });
  

        onkeydown = onkeyup = function(e){
            // e.preventDefault();
            e = e || event; // to deal with IE
            kMap[e.code] = e.type == 'keydown';
            handleActionMappings(kMap);
        }
        
        document.onclick = function () {
            if (player.showCraftingMenu && uiRenderer.selectedCraftable) {
                uiRenderer.selectedCraftable.craft(player, map.droppedItems);
            }
        }

        document.onmousemove = findDocumentCoords;
        document.oncontextmenu = e => e.preventDefault();
        
        onresize = resize;

    }

    function findDocumentCoords(mouseEvent)
    {
      let xpos, ypos;
      if (mouseEvent)
      {
        xpos = mouseEvent.pageX;
        ypos = mouseEvent.pageY;
      }
      else
      {
        //IE
        xpos = window.event.x + document.body.scrollLeft - 2;
        ypos = window.event.y + document.body.scrollTop - 2;
      }
      mouseX = xpos;
      mouseY = ypos;      
    }

    function resize() {
        mapRenderer.updateRenderableLength(gameCanvas);   
        uiRenderer.canvasHeight = canvasHeight;
        uiRenderer.canvasWidth = canvasWidth; 
    }


    function update() {
        canvasWidth = window.innerWidth; //Change Canvas size for preference*******
        canvasHeight = window.innerHeight; //Adjust tile size as well. 
        gameCanvas.width = canvasWidth;
        gameCanvas.height = canvasHeight;
        tileSize = 64;// NEED TO ADJUST TILE SIZE WITH CANVAS SIZE
        canvas.font = (canvasWidth + canvasHeight) / 92 + "px Pixelated";
        canvas.fillRect(0, 0, canvasWidth, canvasHeight);
        if (player && !player.showMap) {
            player.updateMovement(map);
            handleAxisMappings(kMap);
            player.handleEnergy();
        }   
    }
    
    function draw() {
        mapRenderer.render(centerTile, player);        
        uiRenderer.render(mouseX, mouseY, player);
    }

    function loop() {
        let fpsValue = fps.tick();
        window.fps.innerHTML = fpsValue;
        draw();
        window.requestAnimationFrame(loop);
    }

    gameCanvas = document.getElementById('game');
    gameCanvas.style.display = "block";
    canvas = gameCanvas.getContext("2d");

    // need to fix this shit so there's a loading animation/indication while canvas loads.
    if(gameState.game === true){
        update();
        setup();
        requestAnimationFrame(loop);
        setInterval(update, 16);
    }
};

