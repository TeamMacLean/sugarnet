class ApplicationController < ActionController::Base

  def pre
  end

  def result

    fileinput1 = params[:fileInput1]
    # fileinput2 = params[:fileInput2]
    # fileinput3 = params[:fileInput3]

    filepath = nil

    if !fileinput1 || !fileinput1.tempfile || !fileinput1.tempfile.path
      # BAD!
      return render :text => 'SHIT HIT THE FAN!'
    end

    filepath = fileinput1.tempfile.path
    # "gene_nets/fpkm_data.csv"
    puts filepath
    require 'rinruby'

    graphpath = 'public/graphs/'

    @mill = DateTime.now.strftime('%Q')

    @img1 = graphpath+@mill+'1.jpg'
    @img2 = graphpath+@mill+'2.jpg'
    @img3 = graphpath+@mill+'3.jpg'
    @img4 = graphpath+@mill+'4.jpg'
    @img5 = graphpath+@mill+'5.jpg'
    @img6 = graphpath+@mill+'6.jpg'
    @img7 = graphpath+@mill+'7.jpg'
    @img8 = graphpath+@mill+'8.jpg'
    @img9 = graphpath+@mill+'9.jpg'
    @img10 = graphpath+@mill+'10.jpg'
    @img11 = graphpath+@mill+'11.jpg'
    # @img12 = graphpath+@mill+'12.jpg'
    # @img13 = graphpath+@mill+'13.jpg'


    myr = RinRuby.new
    myr.img1 = @img1
    myr.img2 = @img2
    myr.img3 = @img3
    myr.img4 = @img4
    myr.img5 = @img5
    myr.img6 = @img6
    myr.img7 = @img7
    myr.img8 = @img8
    myr.img9 = @img9
    myr.img10 = @img10
    myr.img11 = @img11
    # myr.img12 = @img12
    # myr.img13 = @img13

    myr.filepath = filepath


    myr.eval <<EOF
    source('gene_nets/functions.R')
    load_libraries()

    # these data are FPKM from DOI: 10.1371/journal.pone.0074183
    #raw_filename = "gene_nets/fpkm_data.csv"
# -----INPUT??????-----
    raw_filename = "gene_nets/fpkm_data.csv"
    data <-read.csv(raw_filename, header = TRUE)


    # change 0s to NA
    data[data == 0] <-NA

# subset
    mock <-data[c("tracking_id", "MOCK_1_1", "MOCK_1_2", "MOCK_6_1", "MOCK_6_2",
                  "MOCK_12_1", "MOCK_12_2")]
    avr <-data[c("tracking_id", "AVR_1_1", "AVR_1_2", "AVR_6_1", "AVR_6_2", "AVR_12_1",
                 "AVR_12_2")]
    vir <-data[c("tracking_id", "VIR_1_1", "VIR_1_2", "VIR_6_1", "VIR_6_2", "VIR_12_1",
                 "VIR_12_2")]


    x <-10
    mock <-get_diff_expressed(mock, x, "MOCK")
    avr <-get_diff_expressed(avr, x, "AVR")
    vir <-get_diff_expressed(vir, x, "VIR")

# make lists of gene names
    mock_nodelabels <-get_nodelabels(mock)
    avr_nodelabels <-get_nodelabels(avr)
    vir_nodelabels <-get_nodelabels(vir)

# -----INPUT??????-----
    flg22 <-read.table("gene_nets/just_data_sig_in_both_time_points.txt")
    flg22 <-as.matrix(flg22)
    flg22 <-t(flg22)

# -----INPUT??????-----
    flg22_nodelabels <-as.character(read.table("gene_nets/node_labels_sig_in_both_times.txt") $V1)


    data.frame(mock = length(mock_nodelabels), avr = length(avr_nodelabels), vir = length(vir_nodelabels),
               flg22 = length(flg22_nodelabels))


    mock_long <-make_longitudinal(mock)
    avr_long <-make_longitudinal(avr)
    vir_long <-make_longitudinal(vir)
    flg22_long <-as.longitudinal(flg22, repeats = c(3, 3), time = c(2, 4))
### check all went well...
    is.longitudinal(mock_long)

    y <-250

jpeg(img1)
    mock_edges <-make_net(mock_long, y)
dev.off()

jpeg(img2)
    avr_edges <-make_net(avr_long, y)
dev.off()

jpeg(img3)
    vir_edges <-make_net(vir_long, y)
dev.off()

jpeg(img4)
    flg22_edges <-make_net(flg22_long, y)
dev.off()





     mock_igr <-network.make.igraph(mock_edges, mock_nodelabels)
     avr_igr <-network.make.igraph(avr_edges, avr_nodelabels)
     vir_igr <-network.make.igraph(vir_edges, vir_nodelabels)
     flg22_igr <-network.make.igraph(flg22_edges, flg22_nodelabels)
     union <-graph.union(mock_igr, avr_igr, vir_igr, flg22_igr)


jpeg(img5)
     plot(mock_igr, layout = layout.spring, edge.arrow.size = 0.5, vertex.size = 9,
          vertex.label.cex = 0.7, edge.color = "red")
dev.off()

jpeg(img6)
     plot(avr_igr, layout = layout.auto, edge.arrow.size = 0.5, vertex.size = 9,
          vertex.label.cex = 0.7, edge.color = "blue")
dev.off()

jpeg(img7)
     plot(union, layout = layout.auto, edge.arrow.size = 0.5, vertex.size = 14, vertex.label.cex = 1.2,
          edge.color = "green")
dev.off()

         library("HiveR")

         mock_hive <- make_annotated_hive(mock_igr)


         avr_hive <- make_annotated_hive(avr_igr)


         vir_hive <- make_annotated_hive(vir_igr)


         flg22_hive <- make_annotated_hive(flg22_igr)



         library(plyr)

jpeg(img8)
    # # Change the node color and size based on node degree and betweenness values
         plotHive(mock_hive, method = "abs", bkgnd = "black", axLabs = c("source", "hub", "sink"), axLab.pos = 1)
dev.off()

jpeg(img9)
        plotHive(avr_hive, method = "abs", bkgnd = "black", axLabs = c("source", "hub", "sink"), axLab.pos = 1)
dev.off()

jpeg(img10)
         plotHive(vir_hive, method = "abs", bkgnd = "black", axLabs = c("source", "hub", "sink"), axLab.pos = 1)
dev.off()

jpeg(img11)
         plotHive(flg22_hive, method = "abs", bkgnd = "black", axLabs = c("source", "hub", "sink"), axLab.pos = 1)
dev.off()

         library(venneuler)
         library(stringr)
         mock_genes <- str_sub(V(mock_igr)$name, 1, 9)
         avr_genes <- str_sub(V(avr_igr)$name, 1, 9)
         vir_genes <- str_sub(V(vir_igr)$name, 1, 9)
         flg22_genes <- V(flg22_igr)$name
         euler <- make_fourway_euler_diagram(mock_genes, avr_genes, vir_genes, flg22_genes)

#jpeg(img12)
         plot(euler)
#dev.off()


         rand_mock <- sample(mock_nodelabels, length(mock_genes))
         rand_avr <- sample(avr_nodelabels, length(avr_genes))
         rand_vir <- sample(vir_nodelabels, length(vir_genes))
         rand_flg22 <- sample(flg22_nodelabels, length(flg22_genes))
         rand_euler <- make_fourway_euler_diagram(rand_mock, rand_avr, rand_vir, rand_flg22)

#jpeg(img13)
         plot(rand_euler)
#dev.off()


         write.table(get.edgelist(mock_igr), "mock_edges.txt", col.names = FALSE, row.names = FALSE)
         write.table(get.edgelist(avr_igr), "avr_edges.txt", col.names = FALSE, row.names = FALSE)
         write.table(get.edgelist(vir_igr), "vir_edges.txt", col.names = FALSE, row.names = FALSE)
         write.table(get.edgelist(flg22_igr), "flg22_edges.txt", col.names = FALSE, row.names = FALSE)

EOF
    myr.quit
    # render :text => 'done'
    render
  end
end
