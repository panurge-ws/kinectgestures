window.KinectGestures = window.KinectGestures ? window.KinectGestures : {};

// porting of 
// https://gesturedetector.codeplex.com/SourceControl/latest#GestureDetector/Tools/SkeletonMath.cs
(function(){

    function SkeletonMath(){}

    /// Abstract directions for joint movement</summary>
    var Direction = 
    {
        /// <summary>
        /// A direction along the z-axis
        /// </summary>
        Forward:1,
        /// <summary>
        /// A direction along the z-axis
        /// </summary>
        Backward:2,
        /// <summary>
        /// A direction along the y-axis
        /// </summary>
        Upward:3,
        /// <summary>
        /// A direction along the y-axis
        /// </summary>
        Downward:4,
        /// <summary>
        /// A direction along the x-axis
        /// </summary>
        Left:5,
        /// <summary>
        /// A direction along the x-axis
        /// </summary>
        Right:6,
        /// <summary>
        /// No direction
        /// </summary>
        None:0
    };

    var Tolerance = 0.06;
    var MedianTolerance = 0.01;
    var MedianCorrectNeeded = 0.66666666;

    /// <summary>
    /// Get distance of two skeleton points in meters.</summary>
    SkeletonMath.DistanceBetweenPoints = function(p1, p2)
    {
        var dx = Math.abs(p2.x - p1.x);
        var dy = Math.abs(p2.y - p1.y);
        var dz = Math.abs(p2.z - p1.z);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    SkeletonMath.SubstractPoints = function(op1, op2)
    {
        var res = {};
        res.x = op1.x - op2.x;
        res.y = op1.y - op2.y;
        res.z = op1.z - op2.z;
        return res;
    }

    SkeletonMath.AddPoints = function(op1, op2)
    {
        var res = {};
        res.x = op1.x + op2.x;
        res.y = op1.y + op2.y;
        res.z = op1.z + op2.z;
        return res;
    }


    SkeletonMath.Median = function()
    {
        if (arguments.length === 3)
        {
            return SkeletonMath.Median3(arguments[0],arguments[1],arguments[2]);
        }
        else{
            return SkeletonMath.MedianValues(arguments);
        }
    }

    /// <summary>
    /// the median over three values
    /// </summary>
    /// <param name="d1"></param>
    /// <param name="d2"></param>
    /// <param name="d3"></param>
    /// <returns></returns>
    SkeletonMath.Median3 = function(d1, d2, d3)
    {
        // more performance than copying and sorting
        if ((d1 > d2 && d1 < d3) || (d1 < d2 && d1 > d3))
        {
            return d1;
        }
        if ((d2 > d1 && d2 < d3) || (d2 < d1 && d2 > d3))
        {
            return d2;
        }
        return d3;
    }

    /// <summary>
    /// The median over a unspecified number of values
    /// </summary>
    /// <param name="values"></param>
    /// <returns></returns>
    SkeletonMath.MedianValues = function(values)
    {   
        values.sort();
        return values[values.length/2];
    }

    /// <summary>
    /// The median of the direction between points
    /// </summary>
    /// <param name="from">Source joints</param>
    /// <param name="to">Target joints</param>
    /// <returns></returns>
    SkeletonMath.SteadyDirectionTo = function(from, to)
    {
        var directions = [];
        if (from.length != to.length)
        {
            throw "Length not identical";
        }
        for (var i = 0; i < from.length; i++)
        {
            directions.push({});
            var dx = to[i].x - from[i].x;
            var dy = to[i].y - from[i].y;
            var dz = to[i].z - from[i].z;
            if (dx > MedianTolerance)
            {
                directions[i][Direction.Right] = true;
            }
            else if (dx < -MedianTolerance)
            {
                directions[i][Direction.Left] = true;
            }
            if (dy > MedianTolerance)
            {
                directions[i][Direction.Upward] = true;
            }
            else if (dy < -MedianTolerance)
            {
                directions[i][Direction.Downward] = true;
            }
            if (dz > MedianTolerance)
            {
                directions[i][Direction.Backward] = true;
            }
            else if (dz < -MedianTolerance)
            {
                directions[i][Direction.Forward] = true;
            }
            
        }
        var res = {};
        for (var item in Direction)
        {
            // found enough times in lists
            // TODO check
            var itemFound = 0;
            for (var i = directions.length - 1; i >= 0; i--) {
                if (directions[i][Direction[item]]){
                    itemFound++;
                }
            }

            if (itemFound > from.length * MedianCorrectNeeded)
            {
                res[Direction[item]] = true;
            }
        }
        if (Object.keys(res).length === 0)
        {
            res[Direction.None] = true;
        }
        return res;
    }

    /// <summary>
    /// Get an abstract direction type between two skeleton points</summary>
    /// <param name="from">
    /// Source Point</param>
    /// <param name="to">
    /// Target Point</param>
    /// <returns>
    /// Returns a list of three directions (for each axis)</returns>
    SkeletonMath.DirectionTo = function(from, to)
    {
        var res = {};
        var dx = to.x - from.x;
        var dy = to.y - from.y;
        var dz = to.z - from.z;
        //KinectGestures.log(dx < -Tolerance);
        if (dx > Tolerance)
        {
            res[Direction.Right] = true;
        }
        else if (dx < -Tolerance)
        {
            res[Direction.Left] = true;
        }
        if (dy > Tolerance)
        {
            res[Direction.Upward] = true;
        }
        else if (dy < -Tolerance)
        {
            res[Direction.Downward] = true;
        }
        if (dz > Tolerance)
        {
            res[Direction.Backward] = true;
        }
        else if (dz < -Tolerance)
        {
            res[Direction.Forward] = true;
        }
        if (Object.keys(res).length === 0)
        {
            res[Direction.None] = true;
        }
        return res;
    }


    KinectGestures.SkeletonMath = SkeletonMath;
    KinectGestures.Direction = Direction;
    KinectGestures.SkeletonMath.Direction = Direction;
    
})();
