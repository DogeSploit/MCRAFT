import { updateMotion } from './react/uiMotion'

let lastPosition = { x: 0, y: 0, z: 0 }
let lastPitch = 0
let lastYaw = 0
function hasEntityMoved () {
  if (
    following.entity.position.x !== lastPosition.x ||
    following.entity.position.y !== lastPosition.y ||
    following.entity.position.z !== lastPosition.z ||
    following.entity.pitch !== lastPitch ||
    following.entity.yaw !== lastYaw
  ) {
    lastPosition = following.entity.position
    lastPitch = following.entity.pitch
    lastYaw = following.entity.yaw
    return true
  }
  return false
}

function handleMovement () {
  if (following && !following.entity) {
    // if the following entity cannot be found, switch back to following the bot itself
    console.log('The entity to follow could no longer be found (left/died/too far away/etc.)')
    console.log('Switching back to following the bot itself')
    window.following = bot.entity
    customEvents.emit('followingPlayer', undefined)
  }

  // Not sure what this does. Seems like it updates the translate on canvas element
  // for some sort of UI based motion tracking.
  updateMotion()

  // prevent further unnecessary camera updates
  if (!hasEntityMoved()) {
    return
  }

  const now = Date.now()
  if (now - viewer.world.lastCamUpdate < 1000/30) { // limit to 30 updates per second
    return
  }
  viewer.world.lastCamUpdate = now
  
  setThirdPersonCamera()
  void worldView!.updatePosition(following.entity.position)
}

// Calculate the camera position and angle to follow the entity
function getThirdPersonCameraPosition () {
  const targetPosition = following.entity.position
  
  // Calculate camera position 5 blocks behind and 2 block above target
  const { yaw } = following.entity
  const distance = 5
  const heightOffset = 2
  
  // Calculate camera position behind the entity based on its yaw
  const dx = Math.sin(yaw) * distance
  const dz = Math.cos(yaw) * distance
  
  const cameraPosition = targetPosition.offset(dx, heightOffset, dz)
  const cameraYaw = yaw; // Just use the entity's yaw
  const cameraPitch = -0.2 // always look slightly down at 20%

  return {
    position: cameraPosition,
    yaw: cameraYaw,
    pitch: cameraPitch
  }
}

export function setThirdPersonCamera (directionOnly = false) {
  // TODO: we can also be smarter about the camera to avoid obstacles coming in between.
  // and also handling special situations like water, lava, ladders, etc.

  console.log('Updating camera position')

  // if the following entity is not loaded yet, use the bot's entity here
  const entity = following.entity || bot.entity

  // if the bot itself is being followed, just use first person camera normally
  if (entity === bot.entity) {
    viewer.setFirstPersonCamera(directionOnly ? null : following.entity.position, following.entity.yaw, following.entity.pitch)
    return
  }

  const { position, yaw, pitch } = getThirdPersonCameraPosition()


  viewer.setFirstPersonCamera(directionOnly ? null : position, yaw, pitch)
}

// Have the bot stay right behind the followed entity
// so it's always in sight, and control can be switched back to the bot easily
function moveTowardsFollowedEntity () {
  // We want the bot to stay close to the followed entity so we
  // always remain in sight of the player.

  // ignore if we're following ourselves
  if (bot === following) return

  // ignore if we can't see the entity
  if (!following.entity) return

  const { position: targetPosition } = getThirdPersonCameraPosition()

  // Don't move if we're near the target position
  const distance = bot.entity.position.distanceTo(targetPosition)
  if (distance <= 3) return

  console.log(`Moving towards target position: ${distance} blocks away (${targetPosition})`)
  // move towards the target position...
  void bot.creative.flyTo(targetPosition);
  // ...and look at the entity
  void bot.lookAt(following.entity.position)
}

export function trackFollowerMovement () {
  bot.on('move', () => handleMovement())

  // Handle Entity Changes
  bot.on('entityGone', () => handleMovement())
  bot.on('entityMoved', () => handleMovement())
  bot.on('entityUpdate', () => handleMovement())

  // Keep the bot close to the followed entity
  bot.on('entityMoved', () => moveTowardsFollowedEntity())
}

// Handle Kradle Custom Events
customEvents.on('kradle:followPlayer', async (data) => {
  // const username = 'RainbowUncrn'
  const username = data.username

  console.log(`Follow player '${username}' requested`)

  // undefined means following self
  if(!username) {
    // Back to following self
    console.log(`Following self (main bot)`)
    window.following = bot
    customEvents.emit('followingPlayer', undefined)
    return;
  }

  // check if the player exists
  if (!bot.players[username]){
    // Give it a second to see if it loads eventually
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (!bot.players[username]){
      // It still hasn't loaded, give up on following
      console.error(`Failed to follow player '${username}' in the game (not found)`)

      // Switch to following self
      window.following = bot
      customEvents.emit('followingPlayer', undefined)
      return;
    }
  }

  // check if the entity has been loaded
  // TODO: this will return false even if the entity exists but is simply too far away to be rendered
  // we need to fix this so it works no matter where the player is located. maybe teleport the bot to the player?
  if (!bot.players[username].entity){
    // Give it a second to see if it loads eventually
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (!bot.players[username].entity){
      // It still hasn't loaded, give up on following
      console.error(`'${username}' found but it's position could not be determined`)

      // Switch to following self
      window.following = bot
      customEvents.emit('followingPlayer', undefined)
      return;
    }
  }

  // Follow the player
  console.log(`Following player '${username}'`)
  window.following = bot.players[username];
  customEvents.emit('followingPlayer', username)
})

// export function updateCamera () {
//   if (!window.followingEntity) {
//     return;
//   }

//   viewer.setFirstPersonCamera(window.followingEntity.position, window.followingEntity.yaw, window.followingEntity.pitch)
//   void worldView!.updatePosition(window.followingEntity.position)

//   return entity;
// } 

// // adding a custom property to the bot
// declare module 'mineflayer' {
// 	interface Bot {
// 		_follow: {
// 			username: string | null,
// 			distance: number,
// 			timer: NodeJS.Timer | null
// 		}
// 	}
// }



// // initialize

// let defaultMove;
// function setupMovements() {
//   // if (defaultMove) bot.pathfinder.setMovements(defaultMove);

//   // @ts-expect-error The bot type doesn't match the pathfinder type, but it still works
//   defaultMove = new Movements(bot);
//   defaultMove.allowFreeMotion = true;
//   defaultMove.canDig = false;
//   // defaultMove.allowEntityDetection = false;
//   defaultMove.allow1by1towers = false;
//   defaultMove.maxDropDown = 256; // no fall damage for the viewer
//   defaultMove.allowParkour = true;
//   defaultMove.allowSprinting = true;

//   bot.pathfinder.setMovements(defaultMove);
// }

// customEvents.on('gameLoaded', () => {
//   setupMovements()

//   // Print debug messages when the path changes
//   bot.on('path_update', (r) => {
//     const nodesPerTick = (r.visitedNodes * 50 / r.time).toFixed(2)
//     console.log(`DEBUG: I can get there in ${r.path.length} moves. ` +
//       `Computation took ${r.time.toFixed(2)} ms (${r.visitedNodes} nodes` +
//       `, ${nodesPerTick} nodes/tick)`)
//   })

//   bot.on('goal_reached', (goal) => {
//     console.log('DEBUG: Here I am !')
//   })

//   bot.on('path_reset', (reason) => {
//     console.log(`DEBUG: Path was reset for reason: ${reason}`)
//   })


//   bot._follow = {
//     username: null,
//     distance: 4,
//     timer: null
//   }
// })

// export async function followPlayer(
//   username: string,
//   distance: number = 4
// ) {
//   console.log('followPlayer', username, distance)

//   let player = bot.players[username]?.entity;
//   if (!player) {
//     console.log(`Cannot find player '${username}' in the game`)
//     return false;
//   }

//   // Stop any existing following
//   if (bot._follow.timer) {
//     clearInterval(bot._follow.timer);
//     bot._follow.timer = null;
//   }
//   // stop any existing pathfinder goals
//   bot.pathfinder.stop();

//   const distanceToPlayer = bot.entity.position.distanceTo(player.position);
//   console.log(`Distance to player '${username}': ${distanceToPlayer}`)

//   // if we're far away from the player, attempt to teleport
//   // if (
//   //   distanceToPlayer > 10
//   // ) {
//     console.log(`Teleporting to player '${username}' (${player.position.x}, ${player.position.y}, ${player.position.z})`)
//     bot.chat(`/tp @s ${player.position.x} ${player.position.y + 1} ${player.position.z + 2}`);
//     // wait 200ms to good measure to have it work
//     await new Promise((resolve) => setTimeout(resolve, 200));
//     bot.lookAt(player.position);
//   // }

//   // setupMovements()
//   // // First get to the right x-z position
//   // await bot.pathfinder.goto(new goals.GoalXZ(player.position.x, player.position.z + 4));

//   // Then start follow the player
//   // bot.pathfinder.setGoal(new goals.GoalFollow(player, distance), true);

//   for(let i = 0; i < 1000; i++) {
//     await new Promise((resolve) => setTimeout(resolve, 200));
//     updateCamera(player);
//   }

//   console.log(`Following player '${username}' at distance ${distance}`);

//   return true;
// }


// // function thirdPersonBlock() {
// //   const block = bot.blockAt(bot.entity.position.x, bot.entity.position.y + 1, bot.entity.position.z)

// // }
