window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

// porting of 
// https://gesturedetector.codeplex.com/SourceControl/latest#GestureDetector/Tools/Checker.cs
(function(){

    
    /// <summary>
    /// Instantiates a Checker with a Person to check on.</summary>
    /// <param name="p">
    /// The Person with a set of Kinect skeletons to check on.</param>
    function Checker(person){
        var self = this;
        this.person = person;
    }


    /// <summary>
    /// Get a joints absolute velocity. If theres not enough skeleton information,
    /// precision is decreased automatically.</summary>
    /// <param name="type">
    /// The JointType to get velocity from.</param>
    /// <returns>
    /// Returns the absolute velocity in meters</returns>
    Checker.prototype.GetAbsoluteVelocity = function(jointType)
    {
        if (!this.HasSkeleton(1))
        {
            return 0;
        }
        if (!this.HasSkeleton(3))
        {   
            return this.SimpleAbsoluteVelocity(jointType, 0, 1);
        }
        return KinectGestures.SkeletonMath.Median(this.SimpleAbsoluteVelocity(jointType, 0, 1), this.SimpleAbsoluteVelocity(jointType, 1, 2), this.SimpleAbsoluteVelocity(jointType, 2, 3));
    }

    /// <summary>
    /// Simply calculates the velocity of a joint. Takes two versions.</summary>
    /// <param name="type">
    /// The JointType to get velocity from.</param>
    /// <param name="firstTime">
    /// First index of the persons cached skeletons</param>
    /// <param name="secondTime">
    /// Second index of the persons cached skeletons</param>
    /// <returns>
    /// Returns the absolute velocity in meters</returns>
    Checker.prototype.SimpleAbsoluteVelocity = function(jointType, firstTime, secondTime)
    {
        if (!this.HasSkeleton(firstTime) || !this.HasSkeleton(secondTime))
        {
            throw "No Skeleton at this Index";
        }
        //KinectGestures.log(KinectGestures.SkeletonMath.DistanceBetweenPoints(this.person.GetLastSkeleton(firstTime).joints[jointType].position, this.person.GetLastSkeleton(secondTime).joints[jointType].position))
        //KinectGestures.log(this.person.GetLastSkeleton(firstTime).joints[jointType].position.x - this.person.GetLastSkeleton(secondTime).joints[jointType].position.x);
        return KinectGestures.SkeletonMath.DistanceBetweenPoints(this.person.GetLastSkeleton(firstTime).joints[jointType].position, this.person.GetLastSkeleton(secondTime).joints[jointType].position) * 1000.0 / this.person.MillisBetweenFrames(secondTime, firstTime);
    }

    /// <summary>
    /// Calculates the relative velocity of a joint referencing to a second one.</summary>
    /// <param name="steady">
    /// The referenctial JointType.</param>
    /// <param name="moving">
    /// The moving JointType of interest</param>
    /// <returns>
    /// Returns the relative velocity in meters</returns>
    Checker.prototype.GetRelativeVelocity = function(steady, moving)
    {
        if (!this.HasSkeleton(1))
        {
            return 0;
        }
        var d0 = this.SubstractedPointsAt(steady, moving, 0);
        var d1 = this.SubstractedPointsAt(steady, moving, 1);

        if (!this.HasSkeleton(3))
        {
            return KinectGestures.SkeletonMath.DistanceBetweenPoints(d0, d1) * 1000.0 / this.person.MillisBetweenFrames(1, 0);
        }

        var d2 = this.SubstractedPointsAt(steady, moving, 2);
        var d3 = this.SubstractedPointsAt(steady, moving, 3);
        
        return KinectGestures.SkeletonMath.Median(
            KinectGestures.SkeletonMath.DistanceBetweenPoints(d0, d1) * 1000.0 / this.person.MillisBetweenFrames(1, 0),
            KinectGestures.SkeletonMath.DistanceBetweenPoints(d1, d2) * 1000.0 / this.person.MillisBetweenFrames(2, 1),
            KinectGestures.SkeletonMath.DistanceBetweenPoints(d2, d3) * 1000.0 / this.person.MillisBetweenFrames(3, 2)
        );
    }

    /// <summary>
    /// Checks if a person has a skeleton for a given time.</summary>
    /// <param name="time">
    /// Index of the persons skeleton cache.</param>
    /// <returns>
    /// Returns true if there is a skeleton for the given index, false otherwise.</returns>
    Checker.prototype.HasSkeleton = function(time)
    {
        return this.person.GetLastSkeleton(time) != null;
    }

    Checker.prototype.SubstractedPointsAt = function(steady, moving, time)
    {
        if (!this.HasSkeleton(time))
        {
            throw "No Skeleton at this Index";
        }
        return KinectGestures.SkeletonMath.SubstractPoints(this.person.GetLastSkeleton(time).joints[moving].position, this.person.GetLastSkeleton(time).joints[steady].position);
    }

    /// <summary>
    /// Median of the distance between two points
    /// Median over 3
    /// </summary>
    /// <param name="t1">Joint 1</param>
    /// <param name="t2">Joint 2</param>
    /// <returns>Distance in Meters</returns>
    Checker.prototype.GetDistanceMedian = function(t1, t2)
    {
        if (!this.HasSkeleton(2))
        {
            return this.GetDistance(t1, t2);
        }
        return KinectGestures.SkeletonMath.Median(GetDistance(t1,t2), GetDistance(t1,t2,1), GetDistance(t1,t2,2));
    }

    /// <summary>
    /// The last distance between the points. 
    /// </summary>
    /// <param name="t1">Joint 1</param>
    /// <param name="t2">Joint 2</param>
    /// <returns>Distance in Meters</returns>
    Checker.prototype.GetDistance = function(t1, t2)
    {
        return this.GetDistanceAtTime(t1, t2, 0);
    }

    Checker.prototype.GetDistanceAtTime = function(t1, t2, time)
    {
        if (!this.HasSkeleton(time))
        {
            throw "No Skeleton at this Index";
        }
        return KinectGestures.SkeletonMath.DistanceBetweenPoints(this.person.GetLastSkeleton(time).joints[t1].position, this.person.GetLastSkeleton(time).joints[t2].position);
    }

    /// <summary>
    /// The actual movement directions
    /// High Tolerance
    /// </summary>
    /// <param name="type">Joint</param>
    /// <returns>Enumerable of the directions</returns>
    Checker.prototype.GetAbsoluteMovement = function(type)
    {
        if (!this.HasSkeleton(1))
        {
            var res = {}
            res[KinectGestures.SkeletonMath.Direction.None] = true;
            return res;
        }
        return KinectGestures.SkeletonMath.DirectionTo(this.person.GetLastSkeleton(1).joints[type].position, this.person.CurrentSkeleton().joints[type].position);
    }

    /// <summary>
    /// The actual direction of movement to a relative point
    /// </summary>
    /// <param name="steady">The reference joint</param>
    /// <param name="moving">The joint for the direction</param>
    /// <returns>Enumerable of the directions</returns>
    Checker.prototype.GetRelativeMovement = function(steady, moving)
    {
        if (!this.HasSkeleton(1))
        {
            var res = {}
            res[KinectGestures.SkeletonMath.Direction.None] = true;
            return res;
        }
        return KinectGestures.SkeletonMath.DirectionTo(KinectGestures.SkeletonMath.SubstractPoints(this.person.GetLastSkeleton(1).joints[moving].position, this.person.GetLastSkeleton(1).joints[steady].position),
            KinectGestures.SkeletonMath.SubstractPoints(this.person.CurrentSkeleton().joints[moving].position, this.person.CurrentSkeleton().joints[steady].position));
    }

    /// <summary>
    /// The static position of a joint in relation to another
    /// </summary>
    /// <param name="from">source of the direction</param>
    /// <param name="to">target of the direction</param>
    /// <returns>Enumerable of the directions</returns>
    Checker.prototype.GetRelativePosition = function(from, to)
    {
        return KinectGestures.SkeletonMath.DirectionTo(this.person.CurrentSkeleton().joints[from].position, this.person.CurrentSkeleton().joints[to].position);
    }

    /// <summary>
    /// Direction of a joint over a span of frames
    /// Low tolerance, but movement has to be constant
    /// </summary>
    /// <param name="type">the joint</param>
    /// <param name="duration">number of frames</param>
    /// <returns>Enumerable of the directions</returns>
    Checker.prototype.GetSteadyAbsoluteMovement = function(type, duration)
    {
        var from = [], to = [];
        if (duration < 1)
        {
            throw "Duration must be at least 1";
        }
        for (var i = 0; i < duration && this.HasSkeleton(i+1); i++)
        {
            to.push(this.person.GetLastSkeleton(i).joints[type].position);
            from.push(this.person.GetLastSkeleton(i+1).joints[type].position);
        }
        return KinectGestures.SkeletonMath.SteadyDirectionTo(from, to);
    }

    /// <summary>
    /// Relative movement over a timespawn
    /// Low tolerance, but movement has to be constant
    /// </summary>
    /// <param name="steady">The reference joint</param>
    /// <param name="moving">The joint to get the direction from</param>
    /// <param name="duration">Timespawn in frames</param>
    /// <returns>Enumerable of the directions</returns>
    Checker.prototype.GetSteadyRelativeMovement = function(steady, moving, duration)
    {
        var from = [], to = [];
        if (duration < 1)
        {
            throw "Duration must be at least 1";
        }
        for (var i = 0; i < duration && this.HasSkeleton(i+1); i++)
        {
            to.push(KinectGestures.SkeletonMath.SubstractPoints(this.person.GetLastSkeleton(i).joints[moving].position, this.person.GetLastSkeleton(i).joints[steady].position));
            from.push(KinectGestures.SkeletonMath.SubstractPoints(this.person.GetLastSkeleton(i+1).joints[moving].position, this.person.GetLastSkeleton(i+1).joints[steady].position));
        }
        return KinectGestures.SkeletonMath.SteadyDirectionTo(from, to);
    }

    /// <summary>
    /// The relative position over a timespawn
    /// Low tolerance, but the position has to be constant
    /// </summary>
    /// <param name="from">Source of the direction</param>
    /// <param name="to">target of the direction</param>
    /// <param name="duration">Timespawn in frames</param>
    /// <returns>Enumerable of the directions</returns>
    Checker.prototype.GetSteadyPosition = function(from, to, duration)
    {
        var origin = [], target = [];
        if (duration < 0)
        {
            throw "Duration must be at least 1";
        }
        for (var i = 0; i <= duration && this.HasSkeleton(i); i++)
        {
            target.push(this.person.GetLastSkeleton(i).joints[to].position);
            origin.push(this.person.GetLastSkeleton(i).joints[from].position);
        }
        return KinectGestures.SkeletonMath.SteadyDirectionTo(origin, target);
    }

    KinectGestures.Checker = Checker;

})();
