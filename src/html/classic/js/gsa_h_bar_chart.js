/*
 * Greenbone Security Assistant
 * $Id$
 * Description: Horizontal bar chart in GSA.
 *
 * Authors:
 * Timo Pollmeier <timo.pollmeier@greenbone.net>
 *
 * Copyright:
 * Copyright (C) 2015 Greenbone Networks GmbH
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */

/* Bar styler functions */

/* Main chart generator */
function HorizontalBarChartGenerator ()
{
  function my () {};

  var svg;
  var height;
  var width;
  var margin = {top: 40, right: 30, bottom: 40, left: 175};

  var x_scale = d3.scale.ordinal ();
  var size_scale = d3.scale.linear ();

  var x_axis = d3.svg.axis ()
                      .scale(x_scale)
                      .tickSize (0)
                      .orient("left");

  var size_axis = d3.svg.axis ()
                .scale (size_scale)
                .ticks(5)
                .orient ("bottom");

  var x_axis_elem;
  var size_axis_elem;

  var data_transform = data_raw;
  var bar_style = severity_bar_style ("severity_max",
                                      gsa.severity_levels.max_log,
                                      gsa.severity_levels.max_low,
                                      gsa.severity_levels.max_medium);
  var title = title_static ("Loading bar chart ...", "Bar Chart");

  var records;
  var column_info;
  var data;
  var x_data;
  var size_data;

  var x_label = "";
  var y_label = "";

  var x_field = "value";
  var size_field = "count";

  var show_stat_type = true;

  var csv_data;
  var csv_blob;
  var csv_url;

  var html_table_data;
  var html_table_blob;
  var html_table_url;

  var svg_data;
  var svg_blob;
  var svg_url;

  my.height = function ()
    {
      return height;
    }

  my.width = function ()
    {
      return width;
    }

  my.x_field = function (value)
    {
      if (!arguments.length)
        return x_field;
      x_field = value;
      return my;
    }

  my.y_field = function (value)
    {
      if (!arguments.length)
        return size_field;
      size_field = value;
      return my;
    }

  my.x_label = function (value)
    {
      if (!arguments.length)
        return x_label;
      x_label = value;
      return my;
    }

  my.y_label = function (value)
    {
      if (!arguments.length)
        return y_label;
      y_label = value;
      return my;
    }

  my.bar_style = function (value)
    {
      if (!arguments.length)
        return bar_style;
      bar_style = value;
      return my;
    }

  my.data_transform = function (value)
    {
      if (!arguments.length)
        return data_transform;
      data_transform = value;
      return my;
    }

  my.title = function (value)
    {
      if (!arguments.length)
        return title;
      title = value;
      return my;
    }

  my.show_loading = function (display)
    {
      display.header ().text (title ());
    }

  my.generate = function (original_data, chart, gen_params)
    {
      var display = chart.display ();
      var data_src = chart.data_src ();
      var update = (display.last_generator () == my);

      // evaluate options set by gen_params
      if (gen_params.x_field)
        x_field = gen_params.x_field;

      if (gen_params.y_fields && gen_params.y_fields[0])
        size_field = gen_params.y_fields[0];

      if (gen_params.extra.show_stat_type)
        show_stat_type = !!JSON.parse (gen_params.extra.show_stat_type)

      // Extract records and column info
      switch (data_src.command ())
        {
          case "get_aggregate":
            data = data_transform (original_data, gen_params);
            // Take only top 10 records
            data.records = data.records.slice (0, 10);
            records = data.records;
            column_info = data.column_info;
            break;
          default:
            console.error ("Unsupported command:" + data_src.command ());
            return;
        }

      display.header ().text (title (data));
      x_data = records.map (function (d) { return d [x_field]; });
      size_data = records.map (function (d) { return d [size_field]; });

      var size_sum = 0;
      for (var i in size_data)
        {
          size_sum += size_data[i];
        }
      var size_max = Math.max.apply (null, size_data);

      // Setup display parameters
      height = display.svg ().attr ("height") - margin.top - margin.bottom;
      width = display.svg ().attr ("width") - margin.left - margin.right;

      x_scale.rangeRoundBands ([0, height], 0.125);
      size_scale.range ([0, width]);


      var x_data_abbreviated = [];
      for (var d_index in x_data)
        {
          if (x_data [d_index].length > 25)
            x_data_abbreviated[d_index] = x_data[d_index].slice (0, 25) + "…";
          else
            x_data_abbreviated[d_index] = x_data[d_index];
        }
      x_scale.domain (x_data_abbreviated);
      size_scale.domain ([0, size_max]).nice(10);

      if (!update)
        {
          display.svg ().text ("");
          svg = display.svg ().append ("g");

          display.svg ().on ("mousemove", null)
          display.svg ().on ("mouseleave", null)

          svg.attr ("transform",
                    "translate(" + margin.left + "," + margin.top + ")");

          x_axis_elem = svg.append("g")
                            .attr("class", "x axis")
                            .call(x_axis);

          size_axis_elem = svg.append("g")
                            .attr("class", "y axis")
                            .attr("transform", "translate(0," + height + ")")
                            .call(size_axis);

          my.tip = d3.tip()
            .attr('class', 'd3-tip')
            .style ("font-weight", "normal")
            .offset([-10, 0])
            .html(function(d) {
              var x;
              if (d [x_field + "~long"])
                x = d [x_field + "~long"];
              else
                x = d [x_field]

              if (y_label != "")
                return "<strong>" + y_label + " (" + x + "):</strong><br/> "
                        + d [size_field]
                        + " (" + (100 * d [size_field] / size_sum).toFixed (1) + "%)";
              else
                return "<strong>" + x + ":</strong><br/> " + d [size_field]
                       + " (" + (100 * d [size_field] / size_sum).toFixed (1) + "%)";
            });

        }

      // Add new bars
      svg.selectAll(".bar")
          .data(records)
            .enter().insert("rect", ".x.axis")
              .attr("class", "bar")
              .attr("x", size_scale(0))
              .attr("width", 0)
              .on("mouseover", my.tip.show)
              .on("mouseout", my.tip.hide)

      // Update bar heights and x axis
      svg.selectAll(".bar")
          .data(records)
            .transition().delay (0).duration (250).ease("sin-in-out")
              .attr("y", function(d) { return x_scale(d [x_field]); })
              .attr("height", x_scale.rangeBand())
      x_axis_elem.transition().delay (0).duration (125).ease("sin-in-out").call (x_axis);

      // Update widths and size axis
      svg.selectAll(".bar")
          .data(records)
            .transition().delay (500).duration (250).ease("sin-in-out")
              .attr("width", function(d) { return size_scale(d [size_field]); })
              .attr("style", bar_style);

      size_axis_elem.attr("transform", "translate(0," + height + ")").transition().delay (0).duration (125).ease("sin-in-out").call (size_axis);

      // Fade out and remove unused bars
      svg.selectAll(".bar")
          .data(records)
            .exit ()
              .transition().delay(0).duration(250).ease("sin-in-out")
                .style("opacity", 0)
                .remove ();

      svg.call(my.tip);

      // Create detach menu item
      display.create_or_get_menu_item ("detach")
               .attr("href", "javascript:void(0);")
               .attr("onclick", "javascript:open_detached (\"" + chart.detached_url () + "\")")
               .text("Show detached chart window");

      // Generate CSV
      csv_data = csv_from_records (records,
                                   column_info,
                                   [x_field, size_field],
                                   [column_label (column_info.columns [x_field], true, false, show_stat_type),
                                    column_label (column_info.columns [size_field], true, false, show_stat_type)],
                                   display.header(). text ());
      if (csv_url != null)
        URL.revokeObjectURL (csv_url);
      csv_blob = new Blob([csv_data], { type: "text/csv" });
      csv_url = URL.createObjectURL(csv_blob);

      display.create_or_get_menu_item ("csv_dl")
               .attr("href", csv_url)
               .attr("download", "gsa_bar_chart-" + new Date().getTime() + ".csv")
               .text("Download CSV");

      // Generate HTML table
      html_table_data
        = html_table_from_records (records,
                                   column_info,
                                   [x_field, size_field],
                                   [column_label (column_info.columns [x_field], true, false, show_stat_type),
                                    column_label (column_info.columns [size_field], true, false, show_stat_type)],
                                   display.header(). text (),
                                   data_src.param ("filter"));
      if (html_table_url != null)
        URL.revokeObjectURL (html_table_url);
      html_table_blob = new Blob([html_table_data], { type: "text/html" });
      html_table_url = URL.createObjectURL(html_table_blob);

      display.create_or_get_menu_item ("html_table")
                  .attr("href", html_table_url)
                  .attr("target", "_blank")
                  .text("Show HTML table");

      // Generate SVG after transition
      setTimeout(function()
                  {
                    svg_data = svg_from_elem (display.svg (),
                                              display.header ().text ());
                    if (svg_url != null)
                      URL.revokeObjectURL (svg_url);
                    svg_blob = new Blob([svg_data], { type: "image/svg+xml" });
                    svg_url = URL.createObjectURL(svg_blob);

                    display.create_or_get_menu_item ("svg_window")
                               .attr("href", "javascript:void(0)")
                               .attr("onclick", "blob_img_window (\"" + svg_url + "\")")
                               .text("Show copyable SVG");

                    display.create_or_get_menu_item ("svg_dl")
                               .attr("href", svg_url)
                               .attr("download", "gsa_bar_chart-" + new Date().getTime() + ".svg")
                               .text("Download SVG");
                  }, 600);

      display.update_gen_data (my, gen_params);
    };

  return my;

}