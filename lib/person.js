window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

(function(){

    
    function PersonManager(){}

    PersonManager.persons = {};

    PersonManager.update = function(skeleton)
    {

        var person;
        if (!PersonManager.persons[skeleton.trackingId])
        {
            person = new Person(skeleton.trackingId);
            PersonManager.persons[skeleton.trackingId] = person;
            person.Init();
        }
        else{
            person = PersonManager.persons[skeleton.trackingId];
        }

        person.CheckGestures(skeleton);
    }

    PersonManager.getPerson = function(trackingId)
    {
        if (PersonManager.persons[trackingId])
        {
            return PersonManager.persons[trackingId];
        }
        return null;
    }

    PersonManager.updateGestures = function()
    {
        for(var item in PersonManager.persons)
        {
            PersonManager.persons[item].updateGestures();
        }
    }

    PersonManager.checkSkeletonTracking = function(trackedSkeletons)
    {
        for(var item in PersonManager.persons)
        {
            var found = false;
            for (var i = trackedSkeletons.length - 1; i >= 0; i--) {
                if (trackedSkeletons[i].trackingId === PersonManager.persons[item].trackingId){
                    found = true;
                    break;
                }
            }
            if (!found){
                PersonManager.persons[item] = null;
                delete PersonManager.persons[item];
            }
            
        }
    }

    KinectGestures.PersonManager = PersonManager;



    // **********************
    //
    //
    // PERSON
    //
    //
    // **********************


    var SKELETON_TO_STORE = 8;

    function Person(trackingId){
        
        var self = this;

        self.trackingId = trackingId;
        self.frames = [];
        self.checker = null;
        self.gestures = [];
    }

    Person.prototype.UpdateGestures = function()
    {
        this.gestures = [];
        for (var i = KinectGestures.GestureManager.registeredGestures.length - 1; i >= 0; i--) {
            this.gestures.push(new KinectGestures.GestureManager.registeredGestures[i](this))
        }
    }

    Person.prototype.Init = function()
    {
        this.checker = new KinectGestures.Checker(this);
        this.UpdateGestures();
    }

    Person.prototype.GetLastSkeleton = function(frame)
    {
        if (frame > this.frames.length-1 || frame < 0)
        {
            return null;
        }
        return this.frames[this.frames.length-frame-1] ? this.frames[this.frames.length-frame-1].Skeleton : null; 
    }

    Person.prototype.CheckGestures = function(skeleton)
    {
        this.frames.push({Skeleton:skeleton, Timestamp:Date.now()});
        
        if (this.frames.length === SKELETON_TO_STORE){
            this.frames.shift();
        }

        for (var i = this.gestures.length - 1; i >= 0; i--) {
            this.gestures[i].Check(skeleton);
        }
    }

    Person.prototype.GetLastFrame = function(frame)
    {
        if (frame > this.frames.length-1 || frame < 0)
        {
            return null;
        }
        return this.frames[this.frames.length-frame-1] ? this.frames[this.frames.length-frame-1] : null; 
    }

    Person.prototype.CurrentSkeleton = function()
    {
        return this.frames[this.frames.length-1].Skeleton;
    }

    /// <summary>
    /// Time-difference between two skeletons
    /// </summary>
    /// <param name="first">Relative number of the first frame</param>
    /// <param name="second">Relative number of the second frame</param>
    /// <returns>Milliseconds passed between</returns>
    Person.prototype.MillisBetweenFrames = function(first, second) //get timedifference in millisconds between skeletons
    {
        var diff = (this.GetLastFrame(second).Timestamp - this.GetLastFrame(first).Timestamp);
        //KinectGestures.log(diff);
        //Debug.WriteLineIf(diff < 0, "Time Difference negative in MillisBetweenFrame");
        return diff;
    }

    KinectGestures.Person = Person;
    

})();