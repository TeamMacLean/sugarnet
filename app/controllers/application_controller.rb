class ApplicationController < ActionController::Base

  # Beware, The following code sucks ass, trying to make sense of it is not a good idea.
  # All code was hacked together with no understanding on how to use R

  R_ECHO = true

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

    puts "writing to tmp-#{timestamp}.csv"

    CSV.open("public/tmp/tmp-#{timestamp}.csv", 'wb') do |csv|
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

    output_folder <- 'public/graphs/'

    source('gene_nets/functions.R')
    load_libraries()

    raw_filename = "public/tmp/tmp-#{timestamp}.csv"
    data <- read.csv(raw_filename, header = TRUE)

    data[data == 0] <- 0

    treatments <- unique(data$treatment)

    mock_array <- list()

    euler_array <- list()

    for(t in treatments){

      print(paste0("Current working on: ", t))

      expressions <- subset(data, treatment == t)
      x <- 10
      mock <- get_diff_expressed(expressions, x, t)

      mock_nodelabels <- get_nodelabels(mock)

      mock_long <- make_longitudinal(mock)

      y <- 250

      name <- paste0(output_folder,paste0(t,'-net-#{timestamp}.jpeg'))
      graphs <- c(graphs, name)
      jpeg(name)
      mock_edges <- make_net(mock_long, y)
      dev.off()
      dev.off()

      mock_igr <- network.make.igraph(mock_edges, mock_nodelabels)
      c(mock_array, mock_igr)


      library("HiveR")
      mock_hive <- make_annotated_hive(mock_igr)

      library(plyr)
      name <- paste0(output_folder,paste0(t,'-hive-#{timestamp}.jpeg'))
      graphs <- c(graphs, name)
      jpeg(name)
      plotHive(mock_hive, method = "abs", bkgnd = "black", axLabs = c("source", "hub", "sink"), axLab.pos = 1)
      dev.off()

      # library(venneuler)
      # library(stringr)
      # mock_genes <- str_sub(V(mock_igr)$name, 1, 9)
      # c(euler_array, mock_genes)

    }

# euler <- make_fourway_euler_diagram(euler_array)
# plot(euler)


# union <- graph.union(mock_array)
# name <- paste0(output_folder,paste0(t,'-c-igr-#{timestamp}.jpeg'))
# graphs <- c(graphs, name)
# jpeg(name)
# plot(mock_igr, layout = layout.spring, edge.arrow.size = 0.5, vertex.size = 9, vertex.label.cex = 0.7, edge.color = "red")
# dev.off()

# union <- graph.union(mock_array)
# name <- paste0(output_folder,paste0(t,'-c-hive-#{timestamp}.jpeg'))
# graphs <- c(graphs, name)
# jpeg(name)

# plotHive(mock_hive, method = "abs", bkgnd = "black", axLabs = c("source", "hub", "sink"), axLab.pos = 1)
# dev.off()


EOF

 graphs =  myr.pull('as.vector(graphs)')

    myr.quit

    time_end = Time.now
    time_diff(time_start,time_end)

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
