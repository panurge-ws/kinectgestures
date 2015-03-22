window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

(function(){

    function DebugDrawer()
    {   
        var areaW, areaH,
            areaC,
            multiplier = 300,
            multiplierY = 300;

        var canvasEl = null,
            context = null;

        var record = false;
        var skeletonColors = ['#ff0000','#ff00ff','#ffff00','#0000ff','#fff000','#000fff'];

        function onResize()
        {
            areaW = window.innerWidth;
            areaH = window.innerHeight;
            areaC = {x:areaW/2,y:areaH/2};

            canvasEl.width = areaW;
            canvasEl.height = areaH;
            
            canvasEl.style.width = areaW+'px';
            canvasEl.style.height = areaH+'px';
        }

        function update(frame)
        {
            if (!KinectGestures.DebugDrawer.CanvasElemntID){
                throw "You need to set a canvas element id to use Debug Drawer";
                return;
            }
            
            if (!context){
                
                canvasEl  = document.getElementById(KinectGestures.DebugDrawer.CanvasElemntID);
                if (!canvasEl){
                    throw "Canvas Element ID not valid or not existing: " + KinectGestures.DebugDrawer.CanvasElemntID;
                    return;
                }
                context = canvasEl.getContext('2d');

                if (!context){
                    throw "Canvas Element is not a canvas: " + KinectGestures.DebugDrawer.CanvasElemntID;
                    return;
                }

                onResize();
            }

            context.clearRect(0,0,areaW,areaH);

            for (var iSkeleton = 0; iSkeleton < frame.skeletons.length; ++iSkeleton) {

                var skeleton = frame.skeletons[iSkeleton];
                            
                //skeleton.trackingId;
                //skeleton.trackingState; // 1 = position only, 2 = skeleton
                //skeleton.position;

                if (skeleton.trackingState > 0){

                    updateSkeleton(skeleton, iSkeleton);

                    
                    if (KinectGestures.PlayerPosition.player1 !== null && KinectGestures.PlayerRegister.initPositionPlayer1){
                       var initPos = areaC.x + KinectGestures.PlayerRegister.initPositionPlayer1.x * multiplier;
                       drawCircleAtXY(initPos,areaH-20,40,'#000000','#000000');
                       drawCircleAtXY(initPos+80,areaH-20,40,'#000000','#000000');
                       drawCircleAtXY(initPos-80,areaH-20,40,'#000000','#000000');
                       drawJointAtXY(initPos+KinectGestures.PlayerPosition.player1*80, areaH-20, 40, '#ff0000'); 
                    }
                    else{
                        if (KinectGestures.PlayerRegister.initPositionPlayer1){
                            drawJointAtXY(areaC.x + KinectGestures.PlayerRegister.initPositionPlayer1.x*multiplier, areaH-20, 40, '#ff0000');
                        }
                    }

                    if (KinectGestures.PlayerPosition.player2 !== null && KinectGestures.PlayerRegister.initPositionPlayer2){
                       var initPos = areaC.x + KinectGestures.PlayerRegister.initPositionPlayer2.x*multiplier;
                       drawCircleAtXY(initPos,areaH-20,40,'#000000','#000000');
                       drawCircleAtXY(initPos+80,areaH-20,40,'#000000','#000000');
                       drawCircleAtXY(initPos-80,areaH-20,40,'#000000','#000000');
                       drawJointAtXY(initPos+KinectGestures.PlayerPosition.player2*80, areaH-20, 40, '#ff0000'); 
                    }
                    else{
                        if (KinectGestures.PlayerRegister.initPositionPlayer2){
                            drawJointAtXY(areaC.x + KinectGestures.PlayerRegister.initPositionPlayer2.x*multiplier, areaH-20, 40, '#ff0000');
                        }
                    }
                }
            }

           

        }

        var maxY = 0;

        function updateSkeleton(skeleton, index)
        {   

            var body = [],
                armLeft = [],
                armRight = [],
                legLeft = [],
                legRight = [];

        
            // draw body position
            drawJointAtXY(areaC.x+skeleton.position.x*multiplier, areaH-(skeleton.position.y*areaH), 30, '#000000');
            maxY = Math.max(maxY,skeleton.position.y);
            //KinectGestures.log(maxY);
            // draw joints
            for (var iJoint = 0; iJoint < skeleton.joints.length; ++iJoint) {
                var joint = skeleton.joints[iJoint];
                //joint.jointType;
                //joint.trackingState;
                //joint.position; 
                //console.log(joint.trackingState);
                if (joint.trackingState > 1){

                    var pos = {
                        x:areaC.x+joint.position.x*multiplier,
                        y:areaC.y-joint.position.y*multiplierY
                    }

                    drawJointAtXY(pos.x,pos.y, 10, skeletonColors[index]); 
                    
                    switch (true){
                        case joint.jointType <= 3:
                            body.push(pos);
                        break;
                        case joint.jointType > 3 && joint.jointType <= 7:
                            armLeft.push(pos);
                        break;
                        case joint.jointType > 7 && joint.jointType <= 11:
                            armRight.push(pos);
                        break;
                        case joint.jointType > 11 && joint.jointType <= 15:
                            legLeft.push(pos);
                        break;
                        case joint.jointType > 15 && joint.jointType <= 19:
                            legRight.push(pos);
                        break;
                        
                    }    
                }
            }

            drawPartJoints(body);
            drawPartJoints(armRight);
            drawPartJoints(armLeft);
            drawPartJoints(legRight);
            drawPartJoints(legLeft);

            drawUnionPart(body[0],legRight[0]);
            drawUnionPart(body[0],legLeft[0]);
            drawUnionPart(body[2],armLeft[0]);
            drawUnionPart(body[2],armRight[0]);

        }

        function drawUnionPart(part1,part2)
        {   
            if (part1 && part2){
               context.beginPath();
                context.strokeStyle = '#000000';
                context.moveTo(part1.x,part1.y);
                context.lineTo(part2.x,part2.y);
                context.stroke();  
            }
           
        }

        function drawPartJoints(arrayJoints)
        {   
            if (arrayJoints.length > 0)
            {
                context.beginPath();
                context.strokeStyle = '#000000';
                context.moveTo(arrayJoints[0].x,arrayJoints[0]);
                for (var i = 0; i < arrayJoints.length; i++) {
                    context.lineTo(arrayJoints[i].x,arrayJoints[i].y);
                }
                context.stroke();
            }
           
        }

        function drawJointAtXY(x,y, radius, color)
        {
            context.beginPath();
            context.fillStyle = color ? color : '#ff0000' ;
            context.arc(x,y,radius ? radius : 10,0,2*Math.PI);
            context.fill();
        }

        function drawCircleAtXY(x,y, radius, fillColor, strokeColor)
        {
            context.beginPath();
            context.fillStyle = fillColor ? fillColor : '#ff0000' ;
            context.strokeStyle = strokeColor ? strokeColor : '#ff0000' ;
            context.arc(x,y,radius ? radius : 10,0,2*Math.PI);
            context.fill();
            context.stroke();
        }

        return {
            update:update
        };
    }

    KinectGestures.DebugDrawer = DebugDrawer();

})(window);