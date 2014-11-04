class ApplicationController < ActionController::Base

  # Beware, The following code sucks ass, trying to make sense of it is not a good idea.
  # All code was hacked together with no understanding on how to use R

  R_ECHO = false #DEBUG

  def upload_csv
    file_input = params[:file]

    if !file_input || !file_input.tempfile || !file_input.tempfile.path
      return render :text => 'failed to receive file'
    end

    header_line = ''
    File.open(file_input.tempfile.path) { |f| header_line = f.readline }
    headers_pre = header_line.split(',')

    @headers = []

    # because: fuck new lines!
    headers_pre.each do |header|
      @headers.push(header.gsub("\n", ''))
    end

    render :json => @headers
  end

  def index
    render
  end

  def time_fuck(time)

    if time
      days = time['days'] ? time['days'] * 1440 : 0
      hours = time['hours'] ? time['hours'] * 60 : 0
      mins = time['minutes'] ? time['minutes'] : 0
      days+hours+mins
    else
      0
    end
  end

  def get_results
    require 'rinruby'
    require 'csv'
    require 'time'


    time_start = Time.now

    myr = RinRuby.new(:echo => R_ECHO)

    # ---------- setup

    file = params[:file]
    headers_parsed = JSON[params[:headers]]
    treatments = JSON[params[:options]]


    if !file || !file.tempfile || !file.tempfile.path
      return render :text => 'failed to receive file'
    end


    timestamp = DateTime.now.strftime('%Q')

    tmpCSV = "public/tmp/tmp-#{timestamp}.csv"

    puts tmpCSV

    CSV.open(tmpCSV, 'wb') do |csv|
      csv << %w(expression experiment gene treatment time rep)

      treatments.each do |option|

        id = headers_parsed.select { |h| h['treatment'] == 'ID' }[0]

        gene_col = headers_parsed.index(id)

        # filter out unused and ID
        filter_output = headers_parsed.select { |h| option != 'ID' && option != 'UNUSED' && h['treatment'] == option }

        # for each filter_output add col to expression

        if filter_output.length > 0
          filter_output.each do |header|

            col_index = headers_parsed.index(header)

            puts "processing col #{col_index}..."
            # example = 42187 long
            CSV.foreach(file.tempfile.path, :headers => true) { |row|
              expression = row[col_index]
              experiment = header['name']
              gene = row[gene_col]
              treatment = header['treatment']
              time = time_fuck(header['time'])
              repetition = header['repetition']
              csv << %W(#{expression} #{experiment} #{gene} #{treatment} #{time} #{repetition})
            }
          end
        end
      end
    end

    # timestamp = '1412253936218'

    myr.eval <<EOF
    graphs <- vector()
    union_array <- list()

json_array <- list()

    # path of output images
    output_folder <- 'public/graphs/'

    source('gene_nets/functions.R')
    load_libraries()

    # read input
    raw_filename = "public/tmp/tmp-#{timestamp}.csv"
    data <- read.csv(raw_filename, header = TRUE)

    # clean up dataset
    data[data == 0] <- NA


    # get list of treatments
    treatments <- unique(data$treatment)

    # create empty lists
    # mock_array <- list()

    euler_array <- list()

    for(t in treatments){

      # treatment name
      graphs <- c(graphs, t)
      print(paste0("Current working on: ", t))

      expressions <- subset(data, treatment == t)


      mock <- make_it_like_dans(expressions)

      # x <- 10
      # mock <- get_diff_expressed(df, x, t)

      mock_nodelabels <- get_nodelabels(mock)

      mock_long <- make_longitudinal(mock, expressions)

      y <- 250

      name <- paste0(output_folder,paste0(t,'-net-#{timestamp}.jpeg'))
      graphs <- c(graphs, name)
      jpeg(name)
      mock_edges <- make_net(mock_long, y)
      graphics.off()

      # THIS IS A DIRTY LITTLE HACK
      # mock_edges <- na.omit(mock_edges)

library("jsonlite")
myjson <- toJSON(mock_edges)
name <- paste0(output_folder,paste0(t,'-json-#{timestamp}.json'))
graphs <- c(graphs, name)
cat(myjson, file=name)

myjson <- toJSON(mock_nodelabels)
name <- paste0(output_folder,paste0(t,'-json-names-#{timestamp}.njson'))
graphs <- c(graphs, name)
cat(myjson, file=name)


      mock_igr <- network.make.igraph(mock_edges, mock_nodelabels)

      # union_array <- c(union_array, mock_igr)
      union_array[[length(union_array)+1]] <- mock_igr

  name <- paste0(output_folder,paste0(t,'-igr-#{timestamp}.jpeg'))
  graphs <- c(graphs, name)
  jpeg(name)
  plot(mock_igr, layout = layout.spring, edge.arrow.size = 0.5, vertex.size = 9, vertex.label.cex = 0.7, edge.color = "red")
  graphics.off()

  # SAME AS ABOVE BUT AUTO AND BLUE
  name <- paste0(output_folder,paste0(t,'-igr-auto-#{timestamp}.jpeg'))
  graphs <- c(graphs, name)
  jpeg(name)
  plot(mock_igr, layout = layout.auto, edge.arrow.size = 0.5, vertex.size = 9, vertex.label.cex = 0.7, edge.color = "blue")
  graphics.off()


      library("HiveR")
      mock_hive <- make_annotated_hive(mock_igr)
      library(plyr)
      name <- paste0(output_folder,paste0(t,'-hive-#{timestamp}.jpeg'))
      graphs <- c(graphs, name)
      jpeg(name)
      plotHive(mock_hive, method = "abs", bkgnd = "black", axLabs = c("source", "hub", "sink"), axLab.pos = 1)
      graphics.off()


      # TABLE OUTPUT
      name <- paste0(output_folder,paste0(t,'-edges-#{timestamp}.txt'))
      graphs <- c(graphs, name)
      make_net
      write.table(get.edgelist(mock_igr), name, col.names = FALSE, row.names = FALSE)



    }

  graphs <- c(graphs, 'combined')
  union <- graph.union(union_array)
  name <- paste0(output_folder,paste0(t,'-union-#{timestamp}.jpeg'))
  graphs <- c(graphs, name)
  jpeg(name)
  plot(union, layout = layout.auto, edge.arrow.size = 0.5, vertex.size = 14, vertex.label.cex = 1.2, edge.color = "green")
  graphics.off()


EOF

    File.delete(tmpCSV) if File.exist?(tmpCSV)

    graphs = myr.pull('as.vector(graphs)')

    myr.quit

    time_end = Time.now
    time_diff(time_start, time_end)

    # render :text => 'hello'
    render :json => graphs

  end

  def time_diff(start_time, end_time)

    seconds_diff = (start_time - end_time).to_i.abs

    hours = seconds_diff / 3600
    seconds_diff -= hours * 3600

    minutes = seconds_diff / 60
    seconds_diff -= minutes * 60

    seconds = seconds_diff

    puts "Time to completion: #{hours.to_s.rjust(2, '0')}:#{minutes.to_s.rjust(2, '0')}:#{seconds.to_s.rjust(2, '0')}"

  end

end
