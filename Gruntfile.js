'use strict';

module.exports = function(grunt) {

    require('load-grunt-tasks')(grunt);

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON('package.json'),

        // Task configuration.

        concat: {

            dist: {
                src: [
                'lib/kinect-gestures.js',
                'lib/gesture-checker.js',
                'lib/gesture-manager.js',
                'lib/person.js',
                'lib/tools/checker.js',
                'lib/tools/player-register.js',
                'lib/tools/skeleton-math.js',
                'lib/gestures/player-position.js',
                'lib/gestures/jump.js',
                'lib/gestures/wave.js',
                'lib/gestures/squat.js',
                'lib/gestures/swipe.js',
                'lib/gestures/joystick.js',
                'lib/debug/debug-drawer.js',
                ],
                dest: 'dist/kinect-gestures.js'
            },
            
        },


        uglify: {

            dist: {
                src: ['dist/kinect-gestures.js'],
                dest: 'dist/kinect-gestures.min.js'
            },
            
        },

    });



    // Default task.
    grunt.registerTask('build', ['concat', 'uglify']);

    


};
