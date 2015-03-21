window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

(function(){

    function GestureChecker(person){

        this.person = person;
        this.gestureName = '';
        this.timeout = 0;
        this.conditions = [];

        var _conditionIndex = 0;
        var _startTime = 0;
        var ti = 0;

        this.Check = function(skeleton)
        {
            
            var result = this.conditions[_conditionIndex].Check(skeleton);
            
            if (result)
            {
                //window.log(result.res + ' - ' + this.gestureName);
                switch(result.res)
                {
                    case 0:
                        this.Reset();
                        break;
                    case 1:
                        //window.log('_conditionIndex'+_conditionIndex)
                        if (_conditionIndex === this.conditions.length-1)
                        {   
                            
                            ti++;
                            window.log(this.gestureName + ": " + JSON.stringify(result.args) + " - ti:" + ti);
                            
                            var eventData = result.args ? result.args : {};
                            eventData.trackingId = skeleton.trackingId;
                            KinectGestures.emit(this.gestureName, eventData);
                            this.Reset();
                        }
                        else{
                            //window.log('_conditionIndex'+_conditionIndex)
                            _startTime = Date.now();
                            _conditionIndex++;
                        }
                        
                    case -1:
                        // continue: let's decide the condition itself to reset
                        break;
                }
            }

            if (this.timeout > 0 && _startTime <= Date.now() - this.timeout)
            {
                this.Reset();
            }
        }

        this.Reset = function()
        {
            _conditionIndex = 0;
            _startTime = Date.now();
        }
    }

    KinectGestures.GestureChecker = GestureChecker;

})();