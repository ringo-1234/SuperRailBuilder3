var SuperRailBuilderVersion = "1.5";

//MCTE
importPackage(Packages.jp.ngt.mcte.item); //ItemMiniature

//NGTLib
importPackage(Packages.jp.ngt.ngtlib.io); //NGTLog
importPackage(Packages.jp.ngt.ngtlib.math); //Vec3
importPackage(Packages.jp.ngt.ngtlib.util); //NGTUtilClient MCWrapper
importPackage(Packages.jp.ngt.ngtlib.block); //BlockUtil TileEntityCustom

//RealTrainMod
importPackage(Packages.jp.ngt.rtm); //RTMCore RTMItem RTMResource RTMRail
importPackage(Packages.jp.ngt.rtm.rail); //TileEntityLargeRailBase
importPackage(Packages.jp.ngt.rtm.rail.util); //RailPosition RailMapBasic RailMarker
importPackage(Packages.jp.ngt.rtm.item); //ItemRail
if (!isOldVer) importPackage(Packages.jp.ngt.rtm.modelpack.state); //ResourceStateRail

//Minecraft
importPackage(Packages.net.minecraft.block); //BlockStairs
importPackage(Packages.net.minecraft.init); //Blocks
importPackage(Packages.net.minecraft.nbt); //NBTTagCompound

var isOldVer = RTMCore.VERSION.indexOf("1.7.10") >= 0;
var isKaizPatch = RTMCore.VERSION.indexOf("KaizPatch") !== -1;
var isFixRTM = !isOldVer
  ? Packages.net.minecraftforge.fml.common.Loader.isModLoaded("fix-rtm")
  : false;

var hostPlayerList = new java.util.WeakHashMap();

//##----------------##
//##    Settings    ##
//##----------------##

var underBlock = Blocks.field_150325_L; //Blocks.wool

//--  Settings END  --

function onUpdate(entity, scriptExecuter) {
  entity.field_70177_z = 0;

  var dataMap = entity.getResourceState().getDataMap();
  var world = entity.field_70170_p;
  var hostPlayer = hostPlayerList.get(entity);
  var rider = getRider(entity);
  var ridingEntity = getRidingEntity(entity);

  if (dataMap.getString("VERSIONS") === "") {
    dataMap.setString("VERSIONS", SuperRailBuilderVersion, 1);
  }

  doFollowing(entity, hostPlayer); //1.12用

  if (!hostPlayer) {
    //ホストプレイヤー未登録
    if (rider) {
      hostPlayerList.put(entity, rider);
      var playerEntityId = rider.func_145782_y();
      dataMap.setString("hostPlayerEntityId", playerEntityId, 1);
      dismountPlayer(entity); //プレイヤーを降ろす
      startRiding(entity, rider); //プレイヤーに乗る
    } else if (ridingEntity) {
      hostPlayerList.put(entity, ridingEntity);
      var playerEntityId = ridingEntity.func_145782_y();
      dataMap.setString("hostPlayerEntityId", playerEntityId, 1);
      //初期化
      dataMap.setBoolean("isBuilding", false, 1);
      dataMap.setBoolean("buildComplete", false, 1);
      dataMap.setString("buildData", "", 1);
      dataMap.setString("deleteRailData", "", 1);
    }
  } else if (rider) {
    dismountPlayer(entity); //プレイヤーを降ろす
    dataMap.setBoolean("isEndEdit", true, 1);
  } else {
    //ホストプレイヤー登録済み
    var holdingRailItem = getPlayerRail(hostPlayer);
    var hasRailMarker = false;
    //var hasRailMarker = hasPlayerMarker(hostPlayer); 実装保留
    var isBuilding = dataMap.getBoolean("isBuilding");
    var isEndEdit = dataMap.getBoolean("isEndEdit");
    var isSetUnderBlock = dataMap.getBoolean("isSetUnderBlock");
    var buildComplete = dataMap.getBoolean("buildComplete");
    //var buildData = dataMap.getString("buildData").replace(/☆/g, ",");
    var buildData = dataMap.getString("buildData").split("\u2606").join(",");
    buildData = buildData !== "" ? JSON.parse(buildData) : null;
    //var deleteRailData = dataMap.getString("deleteRailData").replace(/☆/g, ",");
    var deleteRailData = dataMap
      .getString("deleteRailData")
      .split("\u2606")
      .join(",");
    deleteRailData = deleteRailData !== "" ? JSON.parse(deleteRailData) : null;
    var isComplete = false;
    //レール生成
    if (
      (holdingRailItem || hasRailMarker) &&
      isBuilding &&
      !buildComplete &&
      buildData
    ) {
      if (isSetUnderBlock) {
        //マーカー直下にブロックを設置する
        buildData.forEach(function (data) {
          var blockX = data.blockX;
          var blockY = data.blockY - 1;
          var blockZ = data.blockZ;
          setBlock(world, blockX, blockY, blockZ, underBlock, 0, 3);
        });
      }
      if (buildData.length === 2) {
        //通常レール
        var startRP = createRailPosition(buildData[0]);
        var endRP = createRailPosition(buildData[1]);
        var f0 = deleteRailRP(world, startRP);
        var f1 = deleteRailRP(world, endRP);
        if (isAllFalse([f0, f1])) {
          if (holdingRailItem) {
            //レール生成
            buildNormalRail(world, startRP, endRP, holdingRailItem);
          }
          if (hasRailMarker) {
            //マーカー生成 (実装保留)
            buildMarkerNormal([startRP, endRP]);
          }
          isComplete = true;
        }
      } else {
        if (
          buildData.length === 4 &&
          buildData[0].switchType === SwitchType.normal
        ) {
          //分割レール
          var startRPSplit1 = createRailPosition(buildData[0]);
          var endRPSplit1 = createRailPosition(buildData[1]);
          var startRPSplit2 = createRailPosition(buildData[2]);
          var endRPSplit2 = createRailPosition(buildData[3]);
          var f0 = deleteRailRP(world, startRPSplit1);
          var f1 = deleteRailRP(world, endRPSplit1);
          var f2 = deleteRailRP(world, startRPSplit2);
          var f3 = deleteRailRP(world, endRPSplit2);
          if (isAllFalse([f0, f1, f2, f3])) {
            if (holdingRailItem) {
              //レール生成
              buildNormalRail(
                world,
                startRPSplit1,
                endRPSplit1,
                holdingRailItem
              );
              buildNormalRail(
                world,
                startRPSplit2,
                endRPSplit2,
                holdingRailItem
              );
            }
            if (hasRailMarker) {
              //マーカー生成 (実装保留)
              buildMarkerNormal([startRPSplit1, endRPSplit1]);
              buildMarkerNormal([startRPSplit2, endRPSplit2]);
            }
            isComplete = true;
          }
        } else {
          //分岐レール
          var rps = [];
          var fs = [];
          for (var i = 0; i < buildData.length; i++) {
            rps.push(createRailPosition(buildData[i]));
            fs.push(deleteRailRP(world, rps[i]));
          }
          if (isAllFalse(fs)) {
            if (holdingRailItem) {
              //レール生成
              buildBranchRail(world, rps, holdingRailItem);
            }
            if (hasRailMarker) {
              //マーカー生成 (実装保留)
              buildMarkerBranch(rps);
            }
            isComplete = true;
          }
        }
      }
      if (isComplete) dataMap.setBoolean("buildComplete", true, 1);
    }
    //レール削除
    if (deleteRailData && isBuilding) {
      deleteRail(
        world,
        deleteRailData[0],
        deleteRailData[1],
        deleteRailData[2]
      );
      dataMap.setBoolean("buildComplete", true, 1);
    }
    //isEndEdit
    if (isEndEdit) {
      entity.func_70106_y();
    }
  }
}

//##---------------------##
//##    関数(サーバー)    ##
//##---------------------##
function isAllFalse(array) {
  return array.every(function (bool) {
    return bool === false;
  });
}

function getRider(entity) {
  if (isOldVer) {
    return entity.field_70153_n;
  } else {
    var passengers = entity.func_184188_bt();
    var rider = passengers.size() > 0 ? passengers.get(0) : null;
    return rider;
  }
}

function getRidingEntity(entity) {
  if (isOldVer) {
    return entity.field_70154_o;
  } else {
    return entity.func_184187_bx();
  }
}

function startRiding(entity, targetEntity) {
  if (targetEntity) {
    if (isOldVer) entity.func_70078_a(targetEntity);
  }
}

function dismountPlayer(entity) {
  var rider = getRider(entity);
  if (rider) {
    if (isOldVer) rider.func_70078_a(null);
    else rider.func_184210_p();
  }
}

function createRailPosition(data) {
  var rp = null;
  if (isOldVer && !isKaizPatch) {
    rp = new RailPosition(
      data.blockX,
      data.blockY,
      data.blockZ,
      data.markerDir,
      data.height,
      data.anchorYaw,
      data.anchorLength,
      data.switchType
    );
  } else {
    rp = new RailPosition(
      data.blockX,
      data.blockY,
      data.blockZ,
      data.markerDir,
      data.switchType
    );
    rp.anchorLengthHorizontal = data.anchorLength;
    rp.anchorLengthVertical = data.anchorLength;
    rp.anchorPitch = data.anchorPitch;
    rp.anchorYaw = data.anchorYaw;
    rp.cantCenter = data.cantCenter;
    rp.cantEdge = data.cantEdge;
    rp.setHeight(data.height);
    rp.init();
  }
  return rp;
}

function buildBranchRail(world, rps, railItem) {
  try {
    var rootRP = rps[0];
    if (isOldVer && !isKaizPatch) {
      //RTM1.7.10.4x
      var railMaker = new RailMaker(world, rps);
      var railSwitch = railMaker.getSwitch();
      var railMaps = railSwitch.getAllRailMap();
      for (var i = 0; i < railMaps.length; i++) {
        railMaps[i].setRail(
          world,
          RTMRail.largeRailBase0,
          rootRP.blockX,
          rootRP.blockY,
          rootRP.blockZ,
          railItem
        );
      }
      for (var i = 0; i < rps.length; i++) {
        var rp = rps[i];
        setBlock(
          world,
          rp.blockX,
          rp.blockY,
          rp.blockZ,
          RTMRail.largeRailSwitchBase0,
          0,
          3
        );
        var tile = getTileEntity(world, rp.blockX, rp.blockY, rp.blockZ);
        tile.setStartPoint(rootRP.blockX, rootRP.blockY, rootRP.blockZ);
      }
      setBlock(
        world,
        rootRP.blockX,
        rootRP.blockY,
        rootRP.blockZ,
        RTMRail.largeRailSwitchCore0,
        0,
        3
      );
      var tile = getTileEntity(
        world,
        rootRP.blockX,
        rootRP.blockY,
        rootRP.blockZ
      );
      tile.setRailPositions(rps);
      tile.setProperty(railItem);
      tile.setStartPoint(rootRP.blockX, rootRP.blockY, rootRP.blockZ);
      tile.createRailMap();
      tile.sendPacket();
    }
    if (isKaizPatch) {
      //KaizPatch
      var railMaker = new RailMaker(
        world,
        rps,
        RailMapBasic.fixRTMRailMapVersionCurrent
      );
      var railSwitch = railMaker.getSwitch();
      var railMaps = railSwitch.getAllRailMap();
      for (var i = 0; i < railMaps.length; i++) {
        railMaps[i].setRail(
          world,
          RTMRail.largeRailBase0,
          rootRP.blockX,
          rootRP.blockY,
          rootRP.blockZ,
          railItem
        );
      }
      for (var i = 0; i < rps.length; i++) {
        var rp = rps[i];
        setBlock(
          world,
          rp.blockX,
          rp.blockY,
          rp.blockZ,
          RTMRail.largeRailSwitchBase0,
          0,
          3
        );
        var tile = getTileEntity(world, rp.blockX, rp.blockY, rp.blockZ);
        tile.setStartPoint(rootRP.blockX, rootRP.blockY, rootRP.blockZ);
      }
      setBlock(
        world,
        rootRP.blockX,
        rootRP.blockY,
        rootRP.blockZ,
        RTMRail.largeRailSwitchCore0,
        0,
        3
      );
      var tile = getTileEntity(
        world,
        rootRP.blockX,
        rootRP.blockY,
        rootRP.blockZ
      );
      tile.setRailPositions(rps);
      tile.setProperty(railItem);
      tile.setStartPoint(rootRP.blockX, rootRP.blockY, rootRP.blockZ);
      tile.createRailMap();
      tile.func_70296_d();
      world.func_147471_g(rootRP.blockX, rootRP.blockY, rootRP.blockZ);
    }
    if (!isOldVer && !isFixRTM) {
      //RTM2.4.2x
      var railMaker = new RailMaker(world, rps);
      var railSwitch = railMaker.getSwitch();
      var railMaps = railSwitch.getAllRailMap();
      for (var i = 0; i < railMaps.length; i++) {
        railMaps[i].setRail(
          world,
          RTMRail.largeRailBase,
          rootRP.blockX,
          rootRP.blockY,
          rootRP.blockZ,
          railItem
        );
      }
      for (var i = 0; i < rps.length; i++) {
        var rp = rps[i];
        setBlock(
          world,
          rp.blockX,
          rp.blockY,
          rp.blockZ,
          RTMRail.largeRailSwitchBase,
          0,
          3
        );
        var tile = getTileEntity(world, rp.blockX, rp.blockY, rp.blockZ);
        tile.setStartPoint(rootRP.blockX, rootRP.blockY, rootRP.blockZ);
      }
      setBlock(
        world,
        rootRP.blockX,
        rootRP.blockY,
        rootRP.blockZ,
        RTMRail.largeRailSwitchCore,
        0,
        3
      );
      var tile = getTileEntity(
        world,
        rootRP.blockX,
        rootRP.blockY,
        rootRP.blockZ
      );
      tile.setRailPositions(rps);
      tile.getResourceState().readFromNBT(railItem.writeToNBT());
      tile.setStartPoint(rootRP.blockX, rootRP.blockY, rootRP.blockZ);
      tile.createRailMap();
      tile.sendPacket();
    }
    if (isFixRTM) {
      //fixRTM
      var railMaker = new RailMaker(
        world,
        rps,
        RailMapBasic.fixRTMRailMapVersionCurrent
      );
      var railSwitch = railMaker.getSwitch();
      var railMaps = railSwitch.getAllRailMap();
      for (var i = 0; i < railMaps.length; i++) {
        railMaps[i].setRail(
          world,
          RTMRail.largeRailBase,
          rootRP.blockX,
          rootRP.blockY,
          rootRP.blockZ,
          railItem
        );
      }
      for (var i = 0; i < rps.length; i++) {
        var rp = rps[i];
        setBlock(
          world,
          rp.blockX,
          rp.blockY,
          rp.blockZ,
          RTMRail.largeRailSwitchBase,
          0,
          3
        );
        var tile = getTileEntity(world, rp.blockX, rp.blockY, rp.blockZ);
        tile.setStartPoint(rootRP.blockX, rootRP.blockY, rootRP.blockZ);
      }
      setBlock(
        world,
        rootRP.blockX,
        rootRP.blockY,
        rootRP.blockZ,
        RTMRail.largeRailSwitchCore,
        0,
        3
      );
      var tile = getTileEntity(
        world,
        rootRP.blockX,
        rootRP.blockY,
        rootRP.blockZ
      );
      tile.setRailPositions(rps);
      tile.getResourceState().readFromNBT(railItem.writeToNBT());
      tile.setStartPoint(rootRP.blockX, rootRP.blockY, rootRP.blockZ);
      tile.createRailMap();
      tile.sendPacket();
    }
  } catch (e) {
    NGTLog.sendChatMessageToAll(
      "[SuperRailBuilder3] An error occurred while generating rails"
    );
  }
}

function buildNormalRail(world, startRP, endRP, railItem) {
  try {
    if (isOldVer && !isKaizPatch) {
      //1.7.10.4x
      var railMap = new RailMap(startRP, endRP);
      if (railMap.canPlaceRail(world, true, railItem)) {
        railMap.setRail(
          world,
          RTMRail.largeRailBase0,
          startRP.blockX,
          startRP.blockY,
          startRP.blockZ,
          railItem
        );
        setBlock(
          world,
          startRP.blockX,
          startRP.blockY,
          startRP.blockZ,
          RTMRail.largeRailCore0,
          0,
          3
        );
        var tile = getTileEntity(
          world,
          startRP.blockX,
          startRP.blockY,
          startRP.blockZ
        );
        tile.setRailPositions([startRP, endRP]);
        tile.setProperty(railItem);
        tile.setStartPoint(startRP.blockX, startRP.blockY, startRP.blockZ);
        tile.createRailMap();
        tile.sendPacket();
      }
    }
    if (isKaizPatch) {
      //KaizPatch
      var railMap = new RailMapBasic(
        startRP,
        endRP,
        RailMapBasic.fixRTMRailMapVersionCurrent
      );
      if (railMap.canPlaceRail(world, true, railItem)) {
        railMap.setRail(
          world,
          RTMRail.largeRailBase0,
          startRP.blockX,
          startRP.blockY,
          startRP.blockZ,
          railItem
        );
        setBlock(
          world,
          startRP.blockX,
          startRP.blockY,
          startRP.blockZ,
          RTMRail.largeRailCore0,
          0,
          3
        );
        var tile = getTileEntity(
          world,
          startRP.blockX,
          startRP.blockY,
          startRP.blockZ
        );
        tile.setRailPositions([startRP, endRP]);
        tile.setProperty(railItem);
        tile.setStartPoint(startRP.blockX, startRP.blockY, startRP.blockZ);
        tile.createRailMap();
        tile.func_70296_d();
        world.func_147471_g(startRP.blockX, startRP.blockY, startRP.blockZ);
      }
    }
    if (!isOldVer && !isFixRTM) {
      //2.4.2x
      var railMap = new RailMapBasic(startRP, endRP);
      if (railMap.canPlaceRail(world, true, railItem)) {
        railMap.setRail(
          world,
          RTMRail.largeRailBase,
          startRP.blockX,
          startRP.blockY,
          startRP.blockZ,
          railItem
        );
        setBlock(
          world,
          startRP.blockX,
          startRP.blockY,
          startRP.blockZ,
          RTMRail.largeRailCore,
          0,
          3
        );
        var tile = getTileEntity(
          world,
          startRP.blockX,
          startRP.blockY,
          startRP.blockZ
        );
        tile.setRailPositions([startRP, endRP]);
        tile.getResourceState().readFromNBT(railItem.writeToNBT());
        tile.setStartPoint(startRP.blockX, startRP.blockY, startRP.blockZ);
        tile.createRailMap();
        tile.sendPacket();
      }
    }
    if (isFixRTM) {
      var railMap = new RailMapBasic(
        startRP,
        endRP,
        RailMapBasic.fixRTMRailMapVersionCurrent
      );
      if (railMap.canPlaceRail(world, true, railItem)) {
        railMap.setRail(
          world,
          RTMRail.largeRailBase,
          startRP.blockX,
          startRP.blockY,
          startRP.blockZ,
          railItem
        );
        setBlock(
          world,
          startRP.blockX,
          startRP.blockY,
          startRP.blockZ,
          RTMRail.largeRailCore,
          0,
          3
        );
        var tile = getTileEntity(
          world,
          startRP.blockX,
          startRP.blockY,
          startRP.blockZ
        );
        tile.setRailPositions([startRP, endRP]);
        tile.getResourceState().readFromNBT(railItem.writeToNBT());
        tile.setStartPoint(startRP.blockX, startRP.blockY, startRP.blockZ);
        tile.createRailMap();
        tile.sendPacket();
      }
    }
  } catch (e) {
    NGTLog.sendChatMessageToAll(
      "[SuperRailBuilder3] An error occurred while generating rails"
    );
  }
}

function buildMarkerBranch(rps) {
  rps.forEach(function (rp) {
    try {
      //未実装
      if (isOldVer && !isKaizPatch) {
        //RTM1.7.10.4x
      }
      if (isKaizPatch) {
        //KaizPatch
      }
      if (!isOldVer && !isFixRTM) {
        //RTM2.4.2x
      }
      if (isFixRTM) {
        //fixRTM
      }
    } catch (e) {
      NGTLog.sendChatMessageToAll(
        "[SuperRailBuilder3] An error occurred while generating rail markers"
      );
    }
  });
}

function buildMarkerNormal(rps) {
  rps.forEach(function (rp) {
    try {
      //未実装
      if (isOldVer && !isKaizPatch) {
        //RTM1.7.10.4x
      }
      if (isKaizPatch) {
        //KaizPatch
      }
      if (!isOldVer && !isFixRTM) {
        //RTM2.4.2x
      }
      if (isFixRTM) {
        //fixRTM
      }
    } catch (e) {
      NGTLog.sendChatMessageToAll(
        "[SuperRailBuilder3] An error occurred while generating rail markers"
      );
    }
  });
}

function deleteRail(world, x, y, z) {
  var tile = getTileEntity(world, x, y, z);
  if (tile instanceof TileEntityLargeRailBase) {
    var core = tile.getRailCore();
    if (!core) return false;
    var coreRailMap = core.getAllRailMaps()[0];
    if (coreRailMap) {
      var prop = isOldVer ? core.getProperty() : core.getResourceState();
      coreRailMap.breakRail(world, prop, core);
      return true;
    }
  }
  return false;
}

function deleteRailRP(world, rp) {
  return deleteRail(world, rp.blockX, rp.blockY, rp.blockZ);
}

function setBlock(world, x, y, z, block, meta, flag) {
  if (isOldVer) {
    world.func_147465_d(x, y, z, block, meta, flag);
  } else {
    BlockUtil.setBlock(world, x, y, z, block, meta, flag);
  }
}

//##-----------------##
//##    関数(共通)    ##
//##-----------------##
function doFollowing(entity, hostPlayer) {
  if (!entity || !hostPlayer || isOldVer) return;
  var x = hostPlayer.field_70165_t;
  var y = hostPlayer.field_70163_u + 2;
  var z = hostPlayer.field_70161_v;
  entity.func_70107_b(x, y, z);
  entity.field_70159_w = 0;
  entity.field_70181_x = 0;
  entity.field_70179_y = 0;
}

function getTileEntity(world, x, y, z) {
  if (isOldVer) return world.func_147438_o(x, y, z);
  else {
    var blockPos = new Packages.net.minecraft.util.math.BlockPos(
      Math.floor(x),
      Math.floor(y),
      Math.floor(z)
    );
    return world.func_175625_s(blockPos);
  }
}

function getSelectedSlotItem(player) {
  var inventory = player.field_71071_by;
  var index = inventory.field_70461_c;
  if (isOldVer) return inventory.field_70462_a[index];
  else return inventory.field_70462_a.get(index);
}

function hasPlayerMarker(player) {
  var item = getSelectedSlotItem(player);
  if (!item) return false;
  return item.func_77973_b() !== RTMBlock.marker;
}

function getPlayerRail(player) {
  var item = getSelectedSlotItem(player);
  if (!item) return null;
  if (item.func_77973_b() !== RTMItem.itemLargeRail) return null;
  if (isOldVer) {
    return ItemRail.getProperty(item);
  } else {
    var type = RTMResource.RAIL;
    var state = new ResourceStateRail(type, null);
    if (item.func_77942_o()) {
      state.readFromNBT(item.func_77978_p().func_74775_l("State"));
    } else {
      state.setResourceName(type.defaultName);
      var nbt = new NBTTagCompound();
      nbt.func_74782_a("State", state.writeToNBT());
      item.func_77982_d(nbt);
    }
    return state;
  }
}

var SwitchType = {
  normal: new java.lang.Byte(0),
  switch: new java.lang.Byte(1)
};
