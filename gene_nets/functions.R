
load_libraries_but_be_quiet <- function(){
  
  suppressWarnings(suppressPackageStartupMessages(load_libraries()))
}

load_libraries <- function(){
  
  list.of.packages <- c(
    'GeneNet',
    'HiveR',
    'plyr',
    'venneuler'
  )
  new.packages <- list.of.packages[!(list.of.packages %in% installed.packages()[,"Package"])]
  if(length(new.packages)) install.packages(new.packages, repos="http://cran.rstudio.com/")
  a <- lapply(list.of.packages, require, character.only=T)  
}

get_diff_expressed <- function(df,x, name){
    data <- make_it_like_dans(df)

    cols <- get_cols(df)

    first <- cols[[1]]

    first_means <- rowMeans(subset(data, select = first), na.rm = TRUE)

    rest <- cols[-1]

    prev = NULL

    for(c in rest){
            h <- rowMeans(subset(data, select = c), na.rm = TRUE)

            current <- abs(log2(h / first_means)) > log2(x)

            if(!is.null(prev)){
                prev <- current | prev
            } else {
                prev <- current
            }
    }

    data <- data[prev,]
    data <- na.omit(data)
    return(data)
}


get_nodelabels <- function(df){
  return(unique(df$gene))
}

get_cols <- function(df){
    times <- unique(df$time)
    slist = list()

    i = 1

    for (t in times){
        sub <- subset(df, time == t)

        re <- as.vector(unique(sub$experiment))
        slist[[i]] <- re

        i<-i+1
    }
return(slist)
}


make_it_like_dans <- function(expressions, getID = TRUE){
      uniqueExperiments <- unique(expressions$experiment)
      idGetter <- subset(expressions , experiment == uniqueExperiments[1])

      id <- idGetter["gene"]

        mock = NULL

      if(getID){
        mock <- data.frame(id)
      }

      for(u in uniqueExperiments){
        ttt = subset(expressions , experiment == u)
        ue <- ttt["expression"]

#        mock$paste(u) <- NA


        if(!is.data.frame(mock)){
        mock <- data.frame(ue$expression)
        colnames(mock) <- u
        } else {
        mock[,u] <- ue$expression
        }
      }

#      mock[mock == 0] <- NA
      return(mock)
}


make_longitudinal <- function(df, expressions){

    df$gene <- NULL

    times <- unique(expressions$time)
    reps_pre <- max(unique(expressions$rep))
    reps <- c()
    for(t in times){
        reps <- append(reps, reps_pre)
    }

    m <- t(as.matrix(df))


    lon <- as.longitudinal(m, repeats=reps, time=times)
    return(lon)
}

make_net <- function(long,num_edges){
  pcc <- ggm.estimate.pcor(long)
  edges <- network.test.edges(pcc, direct=TRUE,fdr=TRUE)
  net <- extract.network(edges,method.ggm="number",cutoff.ggm=num_edges)
  return(net)
}

##needs a dataframe with 2 cols, in_edge, out_edge
make_hive <- function(df){
  hive <- edge2HPD(edge_df = df)
  hive <- mineHPD(hive,option = "rad <- tot.edge.count")
  hive <- mineHPD(hive,option = "axis <- source.man.sink")
  hive <- mineHPD(hive, option = "remove zero edge")
  return(hive)
}

make_annotated_hive <- function(igraph){

  dataSet <- get.edgelist(igraph)
  dataSet <- as.data.frame(dataSet)
  dataSet$V3 <- rep(1, nrow(dataSet))
  hive <- make_hive(dataSet)

  #totally stole this entire function from https://gist.github.com/Vessy/6562505#file-plotnetworkusinghiver-r
  # Create a graph. Use simplify to ensure that there are no duplicated edges or self loops
  gD <- simplify(graph.data.frame(dataSet, directed=TRUE))

  # Print number of nodes and edges
  # vcount(gD)
  # ecount(gD)

  # Calculate some node properties and node similarities that will be used to illustrate
  # different plotting abilities

  # Calculate degree for all nodes
  degAll <- degree(gD, v = V(gD), mode = "all")

  # Calculate betweenness for all nodes
  betAll <- betweenness(gD, v = V(gD), directed = TRUE) / (((vcount(gD) - 1) * (vcount(gD)-2)) / 2)
  betAll.norm <- (betAll - min(betAll))/(max(betAll) - min(betAll))

  gD <- set.vertex.attribute(gD, "degree", index = V(gD), value = degAll)
  gD <- set.vertex.attribute(gD, "betweenness", index = V(gD), value = betAll.norm)

  # Check the attributes
  # summary(gD)

  gD <- set.edge.attribute(gD, "weight", index = E(gD), value = 0)
  gD <- set.edge.attribute(gD, "similarity", index = E(gD), value = 0)


  # Calculate Dice similarities between all pairs of nodes
  dsAll <- similarity.dice(gD, vids = V(gD), mode = "all")

  # Calculate edge weight based on the node similarity
  F1 <- function(x) {data.frame(V4 = dsAll[which(V(gD)$name == as.character(x$V1)), which(V(gD)$name == as.character(x$V2))])}
  dataSet.ext <- ddply(dataSet, .variables=c("V1", "V2", "V3"), function(x) data.frame(F1(x)))

  for (i in 1:nrow(dataSet.ext))
  {
    E(gD)[as.character(dataSet.ext$V1) %--% as.character(dataSet.ext$V2)]$weight <- as.numeric(dataSet.ext$V3)
    E(gD)[as.character(dataSet.ext$V1) %--% as.character(dataSet.ext$V2)]$similarity <- as.numeric(dataSet.ext$V4)
  }

  rm(degAll, betAll, betAll.norm, F1, dsAll, i)
  ############################################################################################
  #Determine node/edge color based on the properties

  # Calculate node size
  # We'll interpolate node size based on the node betweenness centrality, using the "approx" function
  # And we will assign a node size for each node based on its betweenness centrality
  approxVals <- approx(c(0.5, 1.5), n = length(unique(V(gD)$betweenness)))
  nodes_size <- sapply(V(gD)$betweenness, function(x) approxVals$y[which(sort(unique(V(gD)$betweenness)) == x)])
  rm(approxVals)

  # Define node color
  # We'll interpolate node colors based on the node degree using the "colorRampPalette" function from the "grDevices" library
  library("grDevices")
  # This function returns a function corresponding to a collor palete of "bias" number of elements
  F2 <- colorRampPalette(c("#F5DEB3", "#FF0000"), bias = length(unique(V(gD)$degree)), space = "rgb", interpolate = "linear")
  # Now we'll create a color for each degree
  colCodes <- F2(length(unique(V(gD)$degree)))
  # And we will assign a color for each node based on its degree
  nodes_col <- sapply(V(gD)$degree, function(x) colCodes[which(sort(unique(V(gD)$degree)) == x)])
  rm(F2, colCodes)

  # Assign visual attributes to edges using the same approach as we did for nodes
  F2 <- colorRampPalette(c("#FFFF00", "#006400"), bias = length(unique(E(gD)$similarity)), space = "rgb", interpolate = "linear")
  colCodes <- F2(length(unique(E(gD)$similarity)))
  edges_col <- sapply(E(gD)$similarity, function(x) colCodes[which(sort(unique(E(gD)$similarity)) == x)])
  rm(F2, colCodes)

  nodes <- hive$nodes

  # Change the node color and size based on node degree and betweenness values
  for (i in 1:nrow(nodes))
  {
    nodes$color[i] <- nodes_col[which(nodes$lab[i] == V(gD)$name)]
    nodes$size[i] <- nodes_size[which(nodes$lab[i] == V(gD)$name)]
  }

  # Reassign these nodes to the hive(4) object
  hive$nodes <- nodes

  # And plot it (Figure 2)
  #plotHive(hive4, method = "abs", bkgnd = "white",  axLab.pos = 1)

  # Now do the edges
  edges <- hive$edges

  # Change the edge color based on Dice similarity
  for (i in 1:nrow(edges))
  {
    index1 <- which(nodes$id == edges$id1[i])
    index2 <- which(nodes$id == edges$id2[i])

    edges$color[i] <- edges_col[which(E(gD)[as.character(nodes$lab[index1]) %--% as.character(nodes$lab[index2])] == E(gD))]
  }

  # Reassign these edges to the hive(4) object
  hive$edges <- edges

  # And plot it (Figure 3)
  #plotHive(hive4, method = "abs", bkgnd = "white", axLabs = c("source", "hub", "sink"), axLab.pos = 1)

  # Some edges are too thin to see
  hive$edges$weight <- hive$edges$weight * 2

  return(hive)
}

make_fourway_euler_diagram <- function(alpha,beta,gamma,delta){
  a <- length(alpha)
  b <- length(beta)
  c <- length(gamma)
  d <- length(delta)
  
  a_b <- length(intersect(alpha,beta))
  a_c <- length(intersect(alpha,gamma))
  a_d <- length(intersect(alpha,delta))
  b_c <- length(intersect(beta,gamma))
  b_d <- length(intersect(beta,delta))
  c_d <- length(intersect(gamma,delta))
  a_b_c  <- length(Reduce(intersect, list(alpha,beta,gamma)))
  a_c_d  <- length(Reduce(intersect, list(alpha,gamma,delta)))
  a_b_d <- length(Reduce(intersect, list(alpha,beta,delta)))
  b_c_d <- length(Reduce(intersect, list(beta,gamma,delta)))
  a_b_c_d <- length(Reduce(intersect, list(alpha,beta,gamma,delta)))
  v <- venneuler(c(A=a,B=b,C=c,D=d,"A&B"=a_b,"A&C"=a_c,"A&D"=a_d,"B&C"=b_c,"B&D"=b_d,"C&D"=c_d,"A&B&C"=a_b_c,"A&C&D"=a_c_d, "A&B&D"=a_b_d,"B&C&D"=b_c_d,"A&B&C&D"=a_b_c_d))
  v$labels<- c("Mock", "avr", "vir", "flg22")
  return(v)
}