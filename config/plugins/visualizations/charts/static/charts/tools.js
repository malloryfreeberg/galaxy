// dependencies
define(['utils/utils'], function(Utils) {

// render
function panelHelper (options)
{
    // link this
    var self = this;
    
    // require parameters
    var process_id          = options.process_id;
    var chart               = options.chart;
    var request_dictionary  = options.request_dictionary;
    var render              = options.render;
    var canvas              = options.canvas;
    var app                 = options.app;
    
    // get request size from chart
    request_dictionary.query_limit = chart.definition.query_limit;
    
    // define success function
    request_dictionary.success = function() {
        try {
            // check if this chart has multiple panels
            if (!chart.definition.use_panels && chart.settings.get('use_panels') !== 'true') {
                // draw all groups into a single panel
                if (render(request_dictionary.groups, canvas[0])) {
                    chart.state('ok', 'Chart drawn.');
                }
            } else {
                // draw groups in separate panels
                var valid = true;
                for (var group_index in request_dictionary.groups) {
                    var group = request_dictionary.groups[group_index];
                    if (!render([group], canvas[group_index])) {
                        valid = false;
                        break;
                    }
                }
                if (valid) {
                    chart.state('ok', 'Multi-panel chart drawn.');
                }
            }
            
            // unregister process
            chart.deferred.done(process_id);
        } catch (err) {
            // log
            console.debug('FAILED: Tools::panelHelper() - ' + err);
        
            // set chart state
            chart.state('failed', err);
            
            // unregister process
            chart.deferred.done(process_id);
        }
    };
    
    // add progress
    request_dictionary.progress = function(percentage) {
        chart.state('wait', 'Loading data...' + percentage + '%');
    };
    
    // request data
    app.datasets.request(request_dictionary);
};

// get domain boundaries value
function getDomains(groups, keys) {
    
    // get  value
    function _apply(operator, key) {
        var value = undefined;
        for (var group_index in groups) {
            var value_sub = d3[operator](groups[group_index].values, function(d) { return d[key]; });
            if (value === undefined) {
                value = value_sub;
            } else {
                value = Math[operator](value, value_sub);
            }
        }
        return value;
    };
    
    var result = {};
    for (var index in keys) {
        var key = keys[index];
        result[key] = {
            min : _apply('min', key),
            max : _apply('max', key),
        };
       
    }
    return result;
};

// default series maker
function makeSeries(groups, keys) {
    // plot data
    var plot_data = [];
    
    // loop through data groups
    for (var group_index in groups) {
        // get group
        var group = groups[group_index];
            
        // reset data
        var data = [];
        
        // format chart data
        for (var value_index in group.values) {
            // parse data
            var point = [];
            if (keys) {
                for (var key_index in keys) {
                    var column_index = keys[key_index];
                    point.push(group.values[value_index][column_index]);
                }
            } else {
                for (var column_index in group.values[value_index]) {
                    point.push(group.values[value_index][column_index]);
                }
            }
            
            // add to data
            data.push (point);
        }

        // append series
        plot_data.push(data);
    }
        
       
    // return
    return plot_data;
};

// default category maker
function makeCategories(groups, with_index) {
    // hashkeys, arrays and counter for labeled columns
    var array = {};
    
    // identify label columns
    var chart_definition = groups[0];
    for (var key in chart_definition.columns) {
        var column_def = chart_definition.columns[key];
        if (column_def.is_label) {
            array[key] = [];
        }
    }

    // collect string labels in array
    if (groups && groups[0]) {
        var group = groups[0];
        for (var j in group.values) {
            var value_dict = group.values[j];
            for (var key in array) {
                array[key].push (String(value_dict[key]));
            }
        }
    }
       
    // index all values contained in label columns (for all groups)
    for (var i in groups) {
        var group = groups[i];
        for (var j in group.values) {
            var value_dict = group.values[j];
            for (var key in array) {
                value_dict[key] = parseInt(j)
            }
        }
    }
    
    // return dictionary
    return {
        array : array
    }
};

// category make for unique category labels
function makeCategoriesUnique(groups, with_index) {
    // hashkeys, arrays and counter for labeled columns
    var categories  = {};
    var array       = {};
    var counter     = {};
    
    // identify label columns
    var chart_definition = groups[0];
    for (var key in chart_definition.columns) {
        var column_def = chart_definition.columns[key];
        if (column_def.is_label) {
            categories[key] = {};
            array[key]      = [];
            counter[key]    = 0;
        }
    }
    
    // index all values contained in label columns (for all groups)
    for (var i in groups) {
        var group = groups[i];
        for (var j in group.values) {
            var value_dict = group.values[j];
            for (var key in categories) {
                var value = String(value_dict[key]);
                if (categories[key][value] === undefined) {
                    // add index
                    categories[key][value] = counter[key];
       
                    // array formatter
                    if (with_index) {
                        array[key].push([counter[key], value]);
                    } else {
                        array[key].push(value);
                    }
       
                    // increase counter
                    counter[key]++;
                }
            }
        }
    }

    // convert group values into category indeces
    for (var i in groups) {
        var group = groups[i];
        for (var j in group.values) {
            var value_dict = group.values[j];
            for (var key in categories) {
                var value = String(value_dict[key]);
                value_dict[key] = categories[key][value]
            }
        }
    }
    
    // return dictionary
    return {
        categories  : categories,
        array       : array,
        counter     : counter
    }
};
    
// return
return {
    panelHelper         : panelHelper,
    makeCategories      : makeCategories,
    makeSeries          : makeSeries,
    getDomains          : getDomains
}

});