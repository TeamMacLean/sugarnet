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

    # CSV.open("public/tmp/tmp-#{timpstamp}.csv", 'wb') do |csv|
    #   csv << %w(expression experiment gene treatment time rep)
    #
    #   treatments.each do |option|
    #
    #     id = headers_parsed.select { |h| h['treatment'] == 'ID' }[0]
    #
    #     gene_col = headers_parsed.index(id)
    #
    #     # filter out unused and ID
    #     filter_output = headers_parsed.select { |h| option != 'ID' && option != 'UNUSED' && h['treatment'] == option }
    #
    #     # for each filter_output add col to expression
    #
    #     if filter_output.length > 0
    #       filter_output.each do |header|
    #
    #         col_index = headers_parsed.index(header)
    #
    #         puts "col #{col_index}"
    #
    #         CSV.foreach(file.tempfile.path, :headers => true) { |row|
    #           expression = row[col_index]
    #           experiment = header['name']
    #           gene = row[gene_col]
    #           treatment = header['treatment']
    #           time = time_fuck(header['time'])
    #           repetition = header['repetition']
    #           csv << %W(#{expression} #{experiment} #{gene} #{treatment} #{time} #{repetition})
    #         }
    #       end
    #     end
    #   end
    # end

    timestamp = '1411391204501'

    myr.eval <<EOF
    source('gene_nets/functions.R')
    load_libraries()

    raw_filename = "public/tmp/tmp-#{timestamp}.csv"
    data <- read.csv(raw_filename, header = TRUE)

    data[data == 0] <- 0

    treatments <- unique(data$treatment)

    for(t in treatments){

      expressions <- subset(data, treatment == t)
      mock_nodelabels <- get_nodelabels(expressions)


      # x <- 10
      # mock <- get_diff_expressed(expressions, x, t)


      mock_long <- make_longitudinal(expressions)
      # CHECK
      is.longitudinal(mock_long)

      limit_mock_long = head(mock_long, n=1000)

      y <- 250
      print('making net... This will take some time!')

      mock_edges <- make_net(limit_mock_long, y)
      print('...finished making net')


      print('mock edges')
      print(head(mock_edges))

      # mock_igr <- network.make.igraph(mock_edges, mock_edges)
    }

EOF
    myr.quit
    render :text => 'temp end point'

  end
end
